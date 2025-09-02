const { Router } = require("express");
const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const router = Router();

router.post("/compile", async (req, res) => {
  const latex = req.body?.latex;
  const jobname = (req.body?.jobname || "main").replace(/[^A-Za-z0-9_-]/g, "");
  if (!latex || latex.length > 2_000_000) {
    return res.status(400).json({ error: "Missing 'latex' or too large" });
  }

  let work;
  let killTimer;
  
  try {
    // Create isolated temp dir per request
    work = await fs.mkdtemp(path.join(os.tmpdir(), "tectonic-"));
    const texPath = path.join(work, `${jobname}.tex`);
    const outDir = path.join(work, "out");
    await fs.mkdir(outDir);
    await fs.writeFile(texPath, latex, "utf8");

    // Run Tectonic with correct arguments
    const args = [
      texPath, 
      `--outdir=${outDir}`, 
      "--keep-logs",
      "--outfmt", "pdf",  // Explicitly specify PDF output format
      "--synctex"         // Enable SyncTeX for better error reporting
    ];
    
    const proc = spawn("tectonic", args, { 
      cwd: work,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderrBuf = "";
    let stdoutBuf = "";
    
    proc.stderr.on("data", (d) => (stderrBuf += d.toString()));
    proc.stdout.on("data", (d) => (stdoutBuf += d.toString()));

    // 60s timeout with cleanup
    killTimer = setTimeout(() => {
      proc.kill("SIGKILL");
      cleanup();
    }, 60_000);

    const cleanup = async () => {
      if (killTimer) clearTimeout(killTimer);
      if (work) {
        try {
          await fs.rm(work, { recursive: true, force: true });
        } catch (e) {
          console.warn(`Failed to cleanup temp dir ${work}:`, e.message);
        }
      }
    };

    proc.on("error", async (err) => {
      await cleanup();
      res.status(500).json({ error: `spawn failed: ${err.message}` });
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        await cleanup();
        const errorLog = stderrBuf.slice(-50_000);
        const outputLog = stdoutBuf.slice(-10_000);
        return res.status(422).json({ 
          error: `Compilation failed (exit code ${code})`, 
          log: errorLog,
          output: outputLog
        });
      }
      
      try {
        // Check if PDF exists in out directory first
        const pdfPath = path.join(outDir, `${jobname}.pdf`);
        
        // List files in out directory for debugging
        const outFiles = await fs.readdir(outDir);
        
        // Check if PDF exists
        try {
          await fs.access(pdfPath);
        } catch (accessError) {
          // PDF doesn't exist in out directory, check if it's in the work directory
          const workPdfPath = path.join(work, `${jobname}.pdf`);
          
          try {
            await fs.access(workPdfPath);
            // PDF is in work directory, use that path
            const pdf = await fs.readFile(workPdfPath);
            await cleanup();
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${jobname}.pdf"`);
            res.setHeader("Cache-Control", "no-cache");
            res.send(pdf);
            return;
          } catch (workAccessError) {
            // PDF not found in either location
            await cleanup();
            return res.status(500).json({ 
              error: `PDF not found. Expected at ${pdfPath} or ${workPdfPath}`, 
              log: stderrBuf.slice(-50_000),
              output: stdoutBuf.slice(-10_000),
              outFiles: outFiles
            });
          }
        }
        
        // PDF exists in out directory, read it
        const pdf = await fs.readFile(pdfPath);
        await cleanup();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${jobname}.pdf"`);
        res.setHeader("Cache-Control", "no-cache");
        res.send(pdf);
      } catch (e) {
        await cleanup();
        res.status(500).json({ 
          error: `Failed to read generated PDF: ${e.message}`, 
          log: stderrBuf.slice(-50_000),
          output: stdoutBuf.slice(-10_000)
        });
      }
    });
    
  } catch (error) {
    if (killTimer) clearTimeout(killTimer);
    if (work) {
      try {
        await fs.rm(work, { recursive: true, force: true });
      } catch (e) {
        console.warn(`Failed to cleanup temp dir ${work}:`, e.message);
      }
    }
    res.status(500).json({ error: `Setup failed: ${error.message}` });
  }
});

module.exports = router;
