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
