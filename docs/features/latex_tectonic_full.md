# TutoriAI: LaTeX → PDF with Tectonic (Frontend + Backend)

Below is a minimal, production‑leaning flow to compile GPT‑generated LaTeX into a PDF using **Tectonic** and display it instantly in your React frontend. It includes:

- A typed **API contract**
- A **Node/Express** endpoint that compiles `.tex` → `.pdf`
- A **React hook + component** that posts LaTeX and previews the PDF
- **Security & reliability** notes
- **Dockerfile** for reproducible builds

---

## 0) API Contract
**Endpoint**: `POST /api/latex/compile`

**Request (JSON)**
```json
{
  "latex": "\\documentclass{article}\\begin{document}Hello, Tectonic!\\end{document}",
  "jobname": "main" // optional; defaults to "main"
}
```

**Response**: `application/pdf` (binary body)

**Errors**: `4xx/5xx` JSON with
```json
{ "error": "message", "log": "(optional) compiler output" }
```

---

## 1) Backend (Node + Express + Tectonic)
> Assumes `brew install tectonic` (macOS) or `apt-get install -y tectonic` (Linux), or use Docker section below.

**File**: `backend/src/routes/latex.ts`
```ts
import { Router } from "express";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

const router = Router();

router.post("/compile", async (req, res) => {
  const latex: string | undefined = req.body?.latex;
  const jobname: string = (req.body?.jobname || "main").replace(/[^A-Za-z0-9_-]/g, "");
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
      res.setHeader("Content-Disposition", `inline; filename=\"${jobname}.pdf\"`);
      res.send(pdf);
    } catch (e: any) {
      res.status(500).json({ error: e.message, log: stderrBuf.slice(-50_000) });
    }
  });
});

export default router;
```

**File**: `backend/src/server.ts`
```ts
import express from "express";
import latexRouter from "./routes/latex";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use("/api/latex", latexRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
```

> Tip: On Linux servers, ensure `tectonic` is on PATH for the service user. If using systemd, set `Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin` in your unit.

---

## 2) Frontend (React) – Hook + Viewer
This posts LaTeX to your API and previews the returned PDF. It also shows compile status and error logs.

**File**: `frontend/src/hooks/useLatexPdf.ts`
```ts
import { useState, useCallback } from "react";

export function useLatexPdf() {
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "compiling" }
    | { state: "done"; url: string }
    | { state: "error"; error: string; log?: string }
  >({ state: "idle" });

  const compile = useCallback(async (latex: string, jobname = "main") => {
    setStatus({ state: "compiling" });
    try {
      const res = await fetch("/api/latex/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex, jobname }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setStatus({ state: "done", url });
      return url;
    } catch (e: any) {
      setStatus({ state: "error", error: e.message, log: e.log });
      throw e;
    }
  }, []);

  const reset = useCallback(() => setStatus({ state: "idle" }), []);

  return { status, compile, reset };
}
```

**File**: `frontend/src/components/LatexToPdfViewer.tsx`
```tsx
import React, { useEffect, useState } from "react";
import { useLatexPdf } from "../hooks/useLatexPdf";

export default function LatexToPdfViewer({ latex }: { latex: string }) {
  const { status, compile } = useLatexPdf();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      try {
        const u = await compile(latex, "main");
        revoke = u;
        setUrl(u);
      } catch {}
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [latex, compile]);

  if (status.state === "compiling") return <div>Compiling…</div>;
  if (status.state === "error") return <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{status.error}</pre>;
  if (status.state === "done" && url) {
    return (
      <object data={url} type="application/pdf" width="100%" height="800px">
        <iframe title="pdf" src={url} width="100%" height="800" />
      </object>
    );
  }
  return <div>Ready.</div>;
}
```

---

## 3) Trust & Safety (Running Arbitrary LaTeX)
- **Sandbox**: Compile inside a container or a locked‑down user namespace. Avoid mounting secrets.
- **Timeouts**: Already set to 60s; tune per needs. Add memory limits (e.g., `ulimit`/cgroups) to block runaway jobs.
- **Restricted features**: Consider scanning input to disallow `\write18` / shell‑escape. Tectonic disables shell escapes by default; keep it that way.
- **Rate limiting**: Prevent abuse with token/user rate limits. Cache successful outputs if repeated.

---

## 4) Docker for Reproducibility
**File**: `Dockerfile`
```dockerfile
FROM node:20-bullseye AS deps
RUN apt-get update && apt-get install -y curl ca-certificates gnupg && rm -rf /var/lib/apt/lists/*
# Install Tectonic
RUN apt-get update && apt-get install -y tectonic && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci

COPY backend .
ENV NODE_ENV=production
RUN npm run build || true

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

---

## 5) Optional: Fast “Preview” Before PDF
For instant feedback while typing, render math snippets with **KaTeX/MathJax**. When the user clicks **Export PDF**, call the Tectonic endpoint above. This hybrid pattern keeps the app snappy while still producing high‑quality PDFs.

---

## 6) Smoke Test
```bash
curl -sS -X POST http://localhost:3001/api/latex/compile   -H 'Content-Type: application/json'   -d '{
        "latex": "\\\\documentclass{article}\\\\begin{document}Hello, Tectonic!\\\\end{document}",
        "jobname": "hello"
      }'   --output hello.pdf
open hello.pdf
```
