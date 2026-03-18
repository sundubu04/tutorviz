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
      console.log("Starting LaTeX compilation...", { jobname, latexLength: latex.length });
      
      const res = await fetch("http://localhost:5001/api/latex/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex, jobname }),
      });
      
      console.log("LaTeX compilation response:", { status: res.status, statusText: res.statusText });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        console.error("LaTeX compilation error:", err);
        throw new Error(err.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const blob = await res.blob();
      console.log("LaTeX compilation successful, blob size:", blob.size);
      
      if (blob.size === 0) {
        throw new Error("Received empty PDF file");
      }
      
      const url = URL.createObjectURL(blob);
      setStatus({ state: "done", url });
      return url;
    } catch (e: any) {
      console.error("LaTeX compilation failed:", e);
      setStatus({ state: "error", error: e.message, log: e.log });
      throw e;
    }
  }, []);

  const reset = useCallback(() => setStatus({ state: "idle" }), []);

  return { status, compile, reset };
}
