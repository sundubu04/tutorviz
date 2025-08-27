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
