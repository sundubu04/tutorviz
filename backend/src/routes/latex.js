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

  // Create isolated temp dir per request
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "tectonic-"));
  const texPath = path.join(work, `${jobname}.tex`);
  const outDir = path.join(work, "out");
  await fs.mkdir(outDir);
  await fs.writeFile(texPath, latex, "utf8");

  // Run Tectonic
  const args = [texPath, `--outdir=${outDir}`, "--keep-logs"];
  const proc = spawn("tectonic", args, { cwd: work });

  let stderrBuf = "";
  proc.stderr.on("data", (d) => (stderrBuf += d.toString()));

  const killTimer = setTimeout(() => proc.kill("SIGKILL"), 60_000); // 60s cutoff

  proc.on("error", (err) => {
    clearTimeout(killTimer);
    res.status(500).json({ error: `spawn failed: ${err.message}` });
  });

  proc.on("close", async (code) => {
    clearTimeout(killTimer);
    if (code !== 0) {
      return res.status(422).json({ error: `Compilation failed (code ${code})`, log: stderrBuf.slice(-50_000) });
    }
    try {
      const pdfPath = path.join(outDir, `${jobname}.pdf`);
      const pdf = await fs.readFile(pdfPath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${jobname}.pdf"`);
      res.send(pdf);
    } catch (e) {
      res.status(500).json({ error: e.message, log: stderrBuf.slice(-50_000) });
    }
  });
});

module.exports = router;
