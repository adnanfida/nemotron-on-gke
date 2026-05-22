import React from "react";
import { GKEConfig } from "../types";
import { getGPUVram, getModelInfo } from "../utils/generators";
import { Cpu, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";

interface GPUCalcProps {
  config: GKEConfig;
}

export default function GPUCalc({ config }: GPUCalcProps) {
  const modelInfo = getModelInfo(config);
  const singleGpuVram = getGPUVram(config.gpuType);
  const totalVram = singleGpuVram * config.gpuCount;
  
  // Model size requirements in GB. modelInfo.size is the weight footprint
  // (~2 * params for BF16, ~1 * params for FP8, ~0.5 * params for NVFP4).
  // Plus 25% headroom below for KV cache, activations, and batch buffers.
  // Sanity check examples:
  // - Llama-3.1-Nemotron Nano 8B (BF16, ~16GB weights) -> ~20GB, fits on one L4 (24GB).
  // - Llama-3.1-Nemotron 70B Instruct (BF16, ~140GB)   -> ~175GB, needs 2x A100 80GB or 1x H100 + offload.
  const weightsSize = modelInfo.size;
  const recommendedVram = weightsSize * 1.25; // 25% overhead for KV cache, batches.

  const percentFull = Math.min(100, Math.round((weightsSize / totalVram) * 100)) || 0;
  
  let status: "insufficient" | "tight" | "optimal" = "optimal";
  if (totalVram < weightsSize) {
    status = "insufficient";
  } else if (totalVram < recommendedVram) {
    status = "tight";
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wide text-indigo-600 font-mono uppercase flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-500" />
          Hardware Feasibility & VRAM Gauges
        </h3>
        
        {status === "optimal" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Optimal Fit
          </span>
        )}
        {status === "tight" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Tight Fit (VRAM Limited)
          </span>
        )}
        {status === "insufficient" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Insufficient Hardware
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        {/* Memory Bar */}
        <div className="md:col-span-2">
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span>Model Weights ({weightsSize} GB)</span>
            <span>Total Available VRAM: {totalVram} GB</span>
          </div>
          
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-[2px] border border-slate-200">
            <div 
              style={{ width: `${percentFull}%` }}
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                status === "insufficient" 
                  ? "bg-rose-500" 
                  : status === "tight" 
                  ? "bg-amber-500" 
                  : "bg-emerald-500"
              }`}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 font-medium">
            <span>0 GB</span>
            {status === "insufficient" ? (
              <span className="text-rose-600 font-semibold">Shortfall of {Math.round(weightsSize - totalVram)} GB</span>
            ) : (
              <span className="text-slate-500">Remaining capacity: {Math.max(0, totalVram - weightsSize)} GB</span>
            )}
            <span>{totalVram} GB</span>
          </div>
        </div>

        {/* Dynamic Warning Message */}
        <div className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-200/60">
          {status === "insufficient" && (
            <p className="text-rose-800 leading-relaxed font-sans">
              <strong>Critical Red Alert:</strong> Selected hardware does not meet weight requirements. Your pod will encounter an <strong>OutOfMemory (OOM)</strong> crash on GKE boot. We recommend scaling up your GPU count or switching the GPU pool model.
            </p>
          )}
          {status === "tight" && (
            <p className="text-amber-800 leading-relaxed font-sans">
              <strong>Caution Active:</strong> The weights will load, but leaving sparse KV allocation buffers can trigger OOM errors during concurrent context loads. Set smaller token context sizes or scale from 1 to 2 GPUs.
            </p>
          )}
          {status === "optimal" && (
            <p className="text-emerald-800 leading-relaxed font-sans">
              <strong>Operational Green:</strong> VRAM overhead is comfortable. The selected {config.gpuCount}x {config.gpuType.toUpperCase()} node provides ample workspace to scale concurrency and support high token sequences!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
