import React, { useEffect, useState, useCallback } from "react";
import { useLatexPdf } from "../hooks/useLatexPdf";
import { RefreshCw, AlertCircle, FileText } from "lucide-react";

interface LatexToPdfViewerProps {
  latex: string;
  className?: string;
  onPdfUrlChange?: (url: string | null) => void;
}

export default function LatexToPdfViewer({ latex, className = "", onPdfUrlChange }: LatexToPdfViewerProps) {
  const { status, compile, reset } = useLatexPdf();
  const [url, setUrl] = useState<string | null>(null);
  const [lastCompiledLatex, setLastCompiledLatex] = useState<string>("");

  // Debounced compilation to avoid excessive API calls
  const debouncedCompile = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (latexContent: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (latexContent.trim() && latexContent !== lastCompiledLatex) {
            try {
              const u = await compile(latexContent, "main");
              setUrl(u);
              setLastCompiledLatex(latexContent);
            } catch (error) {
              console.error("LaTeX compilation error:", error);
            }
          }
        }, 1000); // 1 second debounce
      };
    })(),
    [compile, lastCompiledLatex]
  );

  useEffect(() => {
    if (latex.trim()) {
      debouncedCompile(latex);
    }
  }, [latex, debouncedCompile]);

  // Notify parent when PDF URL changes
  useEffect(() => {
    if (onPdfUrlChange) {
      onPdfUrlChange(url);
    }
  }, [url, onPdfUrlChange]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  const handleRetry = async () => {
    reset();
    setUrl(null);
    setLastCompiledLatex("");
    try {
      const u = await compile(latex, "main");
      setUrl(u);
      setLastCompiledLatex(latex);
    } catch (error) {
      console.error("LaTeX compilation error:", error);
    }
  };



  if (status.state === "compiling") {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-sm">Compiling LaTeX to PDF...</p>
        <p className="text-gray-400 text-xs mt-2">This may take a few seconds</p>
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-6 ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Compilation Error</h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-full">
          <pre className="text-sm text-red-800 whitespace-pre-wrap overflow-auto max-h-40">
            {status.error}
          </pre>
          {status.log && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                Show compilation log
              </summary>
              <pre className="text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-32 mt-2">
                {status.log}
              </pre>
            </details>
          )}
        </div>
        <button
          onClick={handleRetry}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry Compilation</span>
        </button>
      </div>
    );
  }

  if (status.state === "done" && url) {
    return (
      <div className={`h-full ${className}`}>
        <object 
          data={url} 
          type="application/pdf" 
          width="100%" 
          height="100%"
          className="w-full h-full"
        >
          <iframe 
            title="PDF Preview" 
            src={url} 
            width="100%" 
            height="100%"
            className="w-full h-full border-0"
          />
        </object>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center h-full ${className}`}>
      <FileText className="h-12 w-12 text-gray-400 mb-4" />
      <p className="text-gray-600 text-sm">Ready to compile LaTeX</p>
      <p className="text-gray-400 text-xs mt-2">Enter LaTeX code to generate PDF</p>
    </div>
  );
}
