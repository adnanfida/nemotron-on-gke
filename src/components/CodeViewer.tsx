import React, { useState } from "react";
import { GeneratedFile } from "../types";
import { FileCode, Copy, Check, Download, Info } from "lucide-react";

interface CodeViewerProps {
  files: GeneratedFile[];
}

export default function CodeViewer({ files }: CodeViewerProps) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [copiedFileIndex, setCopiedFileIndex] = useState<number | null>(null);

  const activeFile = files[activeTabIdx] || files[0];

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedFileIndex(index);
    setTimeout(() => {
      setCopiedFileIndex(null);
    }, 2000);
  };

  const downloadAll = () => {
    let combined = `# ========================================== \n`;
    combined += `# GKE Deployment Configuration Bundle for Nemotron-3 \n`;
    combined += `# ========================================== \n\n`;
    
    files.forEach(f => {
      combined += `\n# --- BEGIN FILE: ${f.name} ---\n`;
      combined += f.content;
      combined += `\n# --- END FILE: ${f.name} ---\n\n`;
    });

    const blob = new Blob([combined], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gke-nemotron-deployment-bundle.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden flex flex-col h-[680px]">
      {/* File listing header - beautiful Light theme tab bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto tab-container scrollbar-none">
          {files.map((file, idx) => (
            <button
              key={file.name}
              onClick={() => setActiveTabIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.8 text-xs font-mono rounded-lg border transition-all ${
                activeTabIdx === idx
                  ? "bg-indigo-650 text-white border-indigo-650 shadow-sm font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              {file.name}
            </button>
          ))}
        </div>

        <button
          onClick={downloadAll}
          className="flex items-center gap-1.5 px-3.5 py-1.8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          title="Download all files bundled as a single file"
        >
          <Download className="w-3.5 h-3.5" />
          Download Assets Bundle
        </button>
      </div>

      {activeFile ? (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
          {/* File description card - Slate-900 with clear light details */}
          <div className="bg-slate-900 border-b border-slate-800 p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 leading-relaxed">
              <strong className="text-white">{activeFile.name}:</strong> {activeFile.description}
            </div>
            <button
              onClick={() => handleCopy(activeFile.content, activeTabIdx)}
              className="flex items-center gap-1.5 px-2.5 py-1.2 rounded bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 transition-all text-[11px] font-mono border border-slate-700 focus:outline-none"
            >
              {copiedFileIndex === activeTabIdx ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Core code preview - premium high-contrast dark block */}
          <div className="flex-1 min-h-0 overflow-auto code-display font-mono text-xs text-slate-300 p-4 leading-relaxed scrollbar-thin">
            <pre className="relative selection:bg-indigo-500/30">
              <code className="block select-text">
                {activeFile.content.split("\n").map((line, idx) => (
                  <div key={idx} className="flex hover:bg-slate-900/40 group px-1">
                    <span className="w-8 inline-block select-none text-slate-600 text-right pr-3 font-mono text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap">{line || " "}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 font-mono">
          <FileCode className="w-12 h-12 text-slate-300 mb-2 animate-bounce" />
          No files generated yet. Adjust configs to trigger blueprints.
        </div>
      )}
    </div>
  );
}
