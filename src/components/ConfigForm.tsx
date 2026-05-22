import React from "react";
import { GKEConfig } from "../types";
import { 
  Server, Cpu, Database, Key, Layers, Settings2, RefreshCcw, Info
} from "lucide-react";

interface ConfigFormProps {
  config: GKEConfig;
  onChange: (updates: Partial<GKEConfig>) => void;
  onReset: () => void;
}

export default function ConfigForm({ config, onChange, onReset }: ConfigFormProps) {
  const models: { id: GKEConfig["modelType"]; label: string; desc: string }[] = [
    { id: "nemotron-3-8b-chat", label: "Nemotron-3 8B Chat", desc: "Multi-turn conversational assistant" },
    { id: "nemotron-3-8b-qa", label: "Nemotron-3 8B QA", desc: "Optimized for Question-Answering (4k)" },
    { id: "nemotron-3-8b-base", label: "Nemotron-3 8B Base", desc: "Foundational base pre-trained model" },
    { id: "nemotron-3-8b-instruct", label: "Nemotron-3 8B Instruct", desc: "Single-turn instruction-following" },
    { id: "nemotron-3-8b-summarize", label: "Nemotron-3 8B Summarize", desc: "Distill documents into key summaries" },
    { id: "nemotron-3-8b-code", label: "Nemotron-3 8B Code", desc: "Tuned for programming & dev syntax" },
    { id: "nemotron-3-nano-30b", label: "Nemotron-3 Nano 30B A3B", desc: "Dense hybrid agentic reasoning agent" },
    { id: "nemotron-3-super-120b", label: "Nemotron-3 Super 120B", desc: "Premium Hybrid Mamba-Transformer MoE (FP8)" },
    { id: "llama-3-nemotron-70b", label: "Llama-3 Nemotron 70B", desc: "NVIDIA-tuned enterprise 140GB tier" },
    { id: "llama-nemotron-ultra-253b", label: "Llama Nemotron Ultra 253B", desc: "Ultra-scale 253B model for extreme code/reasoning" },
    { id: "custom", label: "Custom HF ID", desc: "Provide any custom Hugging Face ID" },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Form header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <Settings2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Deployment Architect
          </h2>
        </div>
        <button 
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-500 font-mono font-semibold transition-colors focus:outline-none"
          title="Reset back to standard setup configurations"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reset Configs
        </button>
      </div>

      <div className="space-y-5">
        {/* SECTION 1: Model Choice */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-500" />
            Model Version
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ modelType: m.id })}
                className={`flex flex-col text-left p-3 rounded-xl border text-sm transition-all duration-200 ${
                  config.modelType === m.id
                    ? "bg-indigo-50/55 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500/10"
                    : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="font-bold text-xs sm:text-sm">{m.label}</span>
                <span className="text-[10px] text-slate-500 mt-1 leading-normal">{m.desc}</span>
              </button>
            ))}
          </div>

          {config.modelType === "custom" && (
            <div className="mt-2.5 text-xs">
              <input
                type="text"
                placeholder="org/custom-nemotron-model"
                value={config.customModelId}
                onChange={(e) => onChange({ customModelId: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/10"
              />
              <span className="text-[10px] text-slate-500 mt-1 block leading-normal">
                Enter your private or customized Hugging Face Model Identifier.
              </span>
            </div>
          )}
        </div>

        {/* SECTION 2: Serving Framework */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Core Inference Engine Framework
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onChange({ servingFramework: "vllm" })}
              className={`flex flex-col p-3 rounded-xl border text-sm transition-all text-left duration-200 ${
                config.servingFramework === "vllm"
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500/10"
                  : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="font-bold text-xs sm:text-sm">vLLM Engine</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">OpenAPI Compliant • Dynamic batching</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ servingFramework: "nim" })}
              className={`flex flex-col p-3 rounded-xl border text-sm transition-all text-left duration-200 ${
                config.servingFramework === "nim"
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500/10"
                  : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="font-bold text-xs sm:text-sm">NVIDIA NIM</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">TRT-LLM Optimized • Official registries</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ servingFramework: "triton" })}
              className={`flex flex-col p-3 rounded-xl border text-sm transition-all text-left duration-200 ${
                config.servingFramework === "triton"
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500/10"
                  : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="font-bold text-xs sm:text-sm">Triton Server</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">Multi-model pipelines • Heavy scale</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: Acceleration hardware */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              NVIDIA GPU Type
            </label>
            <select
              value={config.gpuType}
              onChange={(e) => onChange({ gpuType: e.target.value as any })}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="nvidia-l4">NVIDIA L4 Tensor Core (24GB VRAM)</option>
              <option value="nvidia-a100-40gb">NVIDIA A100 Tensor Core (40GB VRAM)</option>
              <option value="nvidia-a100-80gb">NVIDIA A100 Tensor Core (80GB VRAM)</option>
              <option value="nvidia-h100-80gb">NVIDIA H100 Tensor Core (80GB VRAM)</option>
              <option value="nvidia-t4">NVIDIA T4 (16GB VRAM - Legacy)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5 justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                Accelerator Count ({config.gpuCount})
              </span>
              <span className="text-[10px] text-slate-400 lowercase font-mono">Tensor Parallelism</span>
            </label>
            <div className="flex items-center gap-2 select-none">
              {[1, 2, 4, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChange({ gpuCount: num })}
                  className={`flex-1 py-2 text-center text-xs font-mono font-bold rounded-lg border transition-all ${
                    config.gpuCount === num
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  {num}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 4: GKE Cluster specs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              GKE Cluster Managed Type
            </label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => onChange({ gkeType: "autopilot" })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  config.gkeType === "autopilot"
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Autopilot
              </button>
              <button
                type="button"
                onClick={() => onChange({ gkeType: "standard" })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  config.gkeType === "standard"
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Standard Pool
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Kubernetes Namespace & Service
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="namespace"
                value={config.namespace}
                onChange={(e) => onChange({ namespace: e.target.value })}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/10"
              />
              <select
                value={config.serviceType}
                onChange={(e) => onChange({ serviceType: e.target.value as any })}
                className="bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ClusterIP">ClusterIP (Internal)</option>
                <option value="LoadBalancer">LoadBalancer (External)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 5: Storage Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            Weights Storage Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onChange({ storageType: "empty-dir" })}
              className={`flex flex-col p-3 rounded-xl border text-sm transition-all text-left duration-200 ${
                config.storageType === "empty-dir"
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500/10"
                  : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="font-bold text-xs sm:text-sm">EmptyDir Cache</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-normal">Local ephemeral RAM/disk storage caching</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ storageType: "pvc" })}
              className={`flex flex-col p-3 rounded-xl border text-sm transition-all text-left duration-200 ${
                config.storageType === "pvc"
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500/10"
                  : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="font-bold text-xs sm:text-sm">SSD Persistent PVC</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-normal">Dedicated cloud high-speed storage disk</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ storageType: "gcs-fuse" })}
              className={`flex flex-col p-3 rounded-xl border text-sm transition-all text-left duration-200 ${
                config.storageType === "gcs-fuse"
                  ? "bg-indigo-50/50 border-indigo-600 text-indigo-900 ring-1 ring-indigo-500/10"
                  : "bg-slate-50/60 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <span className="font-bold text-xs sm:text-sm">GCS FUSE Mount</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-normal">Stream model parameters from Cloud Storage</span>
            </button>
          </div>

          {config.storageType === "pvc" && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2.5">
              <label className="text-xs text-slate-600 font-bold whitespace-nowrap font-mono">Disk Capacity (GB):</label>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={config.pvcSize}
                onChange={(e) => onChange({ pvcSize: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-xs font-mono font-bold text-indigo-600">{config.pvcSize} GB</span>
            </div>
          )}

          {config.storageType === "gcs-fuse" && (
            <div className="flex flex-col gap-1 p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2.5 text-xs">
              <label className="text-xs text-slate-600 font-bold mb-1 font-mono">GCS Bucket Name:</label>
              <input
                type="text"
                placeholder="my-gke-nemotron-weights"
                value={config.gcsBucketName}
                onChange={(e) => onChange({ gcsBucketName: e.target.value })}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 leading-normal font-medium font-mono">
                <Info className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                Standard integration assumes Workload Identity is configured in GKE.
              </span>
            </div>
          )}
        </div>

        {/* SECTION 6: Secrets & Identity Checklist */}
        <div className="space-y-2">
          <label className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-indigo-500" />
            Security & Identity Options
          </label>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.useHuggingFaceToken}
                onChange={(e) => onChange({ useHuggingFaceToken: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500/20"
              />
              <div className="flex flex-col mt-[-2px]">
                <span>Enable Private Hugging Face Token Auth</span>
                <span className="text-[10px] text-slate-500 leading-normal mt-0.5 font-normal">
                  Inject HF_TOKEN inside environmental containers to securely download proprietary weights.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none border-t border-slate-200/60 pt-2.5">
              <input
                type="checkbox"
                checked={config.useNGCKey || config.servingFramework === "nim"}
                disabled={config.servingFramework === "nim"}
                onChange={(e) => onChange({ useNGCKey: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500/20 disabled:opacity-50"
              />
              <div className="flex flex-col mt-[-2px]">
                <span className={config.servingFramework === "nim" ? "text-indigo-600 font-bold" : ""}>
                  Enable NVIDIA NGC API Credentials {config.servingFramework === "nim" ? "(Required for NIM)" : ""}
                </span>
                <span className="text-[10px] text-slate-500 leading-normal mt-0.5 font-normal">
                  Provide registry credentials. Critical for officially optimized containers or NIM services.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer select-none border-t border-slate-200/60 pt-2.5">
              <input
                type="checkbox"
                checked={config.enableWorkloadIdentity}
                onChange={(e) => onChange({ enableWorkloadIdentity: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500/20"
              />
              <div className="flex flex-col mt-[-2px]">
                <span>Enable Google Workload Identity Setup</span>
                <span className="text-[10px] text-slate-500 leading-normal mt-0.5 font-normal">
                  Inject secure GCP IAM permissions directly into Kubernetes ServiceAccounts to speak safely with metadata.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
