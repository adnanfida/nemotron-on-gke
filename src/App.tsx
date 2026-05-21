import React, { useState } from "react";
import { GKEConfig } from "./types";
import { generateAllFiles } from "./utils/generators";
import GPUCalc from "./components/GPUCalc";
import ConfigForm from "./components/ConfigForm";
import CodeViewer from "./components/CodeViewer";
import ChatConsultant from "./components/ChatConsultant";
import { Sparkles, Terminal, FileCode, MessageSquare } from "lucide-react";

export default function App() {
  const [config, setConfig] = useState<GKEConfig>({
    modelType: "nemotron-3-8b-chat",
    customModelId: "",
    servingFramework: "vllm",
    gpuType: "nvidia-l4",
    gpuCount: 1,
    gkeType: " autopilot",
    storageType: "empty-dir",
    pvcSize: 200,
    gcsBucketName: "",
    serviceType: "LoadBalancer",
    namespace: "default",
    useHuggingFaceToken: true,
    useNGCKey: false,
    enableWorkloadIdentity: false,
  });

  const [activePaneTab, setActivePaneTab] = useState<"blueprints" | "advisor">("blueprints");

  const files = generateAllFiles(config);

  const handleConfigChange = (updates: Partial<GKEConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      // Standard rule validations:
      if (next.servingFramework === "nim") {
        next.useNGCKey = true; // NIM strictly requires NGC API Key
      }
      return next;
    });
  };

  const resetConfig = () => {
    setConfig({
      modelType: "nemotron-3-8b-chat",
      customModelId: "",
      servingFramework: "vllm",
      gpuType: "nvidia-l4",
      gpuCount: 1,
      gkeType: " autopilot",
      storageType: "empty-dir",
      pvcSize: 200,
      gcsBucketName: "",
      serviceType: "LoadBalancer",
      namespace: "default",
      useHuggingFaceToken: true,
      useNGCKey: false,
      enableWorkloadIdentity: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-indigo-500/20">
      {/* Decorative background grid and ambient glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.06),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      {/* Main Core Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10 flex flex-col justify-between gap-6 relative z-10">
        
        {/* Header Branding */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-row items-center justify-center shadow-sm">
              <Terminal className="w-5 h-5 text-indigo-605" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 font-sans flex items-center gap-2">
                Nemotron-3 GKE Deployment Generator
                <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
                Generate optimized GKE Kubernetes manifests, SSD persistent volume claims, and NVIDIA acceleration specifications to scale Meta and NeMo weights.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm font-semibold select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PLATFORM: GOOGLE CLOUD</span>
            <span className="text-indigo-200">•</span>
            <span>CLUSTER: AUTOMATIC DEPLOY READY</span>
          </div>
        </header>

        {/* Dynamic GPU Feasibility Calculator */}
        <GPUCalc config={config} />

        {/* Core Layout Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Configuration Parameters Panel (Left) */}
          <div className="lg:col-span-5 h-full">
            <ConfigForm 
              config={config} 
              onChange={handleConfigChange} 
              onReset={resetConfig} 
            />
          </div>

          {/* Generated Blueprints / Advisor Pane (Right) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Tab Controller in Light Theme */}
            <div className="flex rounded-xl bg-[#ededf4] border border-slate-200 p-1 shadow-sm self-start">
              <button
                onClick={() => setActivePaneTab("blueprints")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activePaneTab === "blueprints"
                    ? "bg-white text-indigo-650 shadow-sm border border-slate-200/50"
                    : "text-slate-550 hover:text-slate-800"
                }`}
              >
                <FileCode className="w-4 h-4" />
                Kubernetes Manifests
              </button>
              
              <button
                onClick={() => setActivePaneTab("advisor")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activePaneTab === "advisor"
                    ? "bg-white text-indigo-650 shadow-sm border border-slate-200/50"
                    : "text-slate-550 hover:text-slate-800"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                GKE Advisor AI Chat
              </button>
            </div>

            {/* Dynamic Rendering */}
            {activePaneTab === "blueprints" ? (
              <CodeViewer files={files} />
            ) : (
              <ChatConsultant config={config} />
            )}
          </div>
        </main>

        {/* Humble and minimal professional footer */}
        <footer className="border-t border-slate-200 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-semibold gap-4">
          <p>© 2026 Kubernetes LLM Architect Series. Built for advanced Nvidia acceleration.</p>
          <div className="flex items-center gap-4">
            <a href="https://huggingface.co/nvidia" referrerPolicy="no-referrer" target="_blank" className="hover:text-slate-650 transition-colors">NVIDIA HF Profile</a>
            <span>•</span>
            <a href="https://cloud.google.com/kubernetes-engine" referrerPolicy="no-referrer" target="_blank" className="hover:text-slate-650 transition-colors">GKE Documentation</a>
          </div>
        </footer>

      </div>
    </div>
  );
}
