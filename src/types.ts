export interface GKEConfig {
  modelType:
    // Nemotron 3 family (hybrid Mamba-Transformer)
    | "nemotron-3-nano-4b"
    | "nemotron-3-nano-30b-a3b-bf16"
    | "nemotron-3-nano-30b-a3b-fp8"
    | "nemotron-3-nano-omni-30b-a3b"
    | "nemotron-3-super-120b-a12b-nvfp4"
    // Llama-3.1-Nemotron family (Llama backbone, NVIDIA-tuned)
    | "llama-3-1-nemotron-nano-8b"
    | "llama-3-1-nemotron-super-49b"
    | "llama-3-1-nemotron-70b"
    | "llama-3-1-nemotron-ultra-253b"
    | "custom";
  customModelId: string;
  servingFramework: "vllm" | "nim" | "triton";
  gpuType: "nvidia-l4" | "nvidia-a100-40gb" | "nvidia-a100-80gb" | "nvidia-h100-80gb" | "nvidia-t4";
  gpuCount: number;
  gkeType: "autopilot" | "standard";
  storageType: "gcs-fuse" | "pvc" | "empty-dir";
  pvcSize: number; // in GB
  gcsBucketName: string;
  serviceType: "ClusterIP" | "LoadBalancer";
  namespace: string;
  useHuggingFaceToken: boolean;
  useNGCKey: boolean;
  enableWorkloadIdentity: boolean;
}

export interface GeneratedFile {
  name: string;
  language: string;
  content: string;
  description: string;
}

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}
