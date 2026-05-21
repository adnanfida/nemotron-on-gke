export interface GKEConfig {
  modelType: 
    | "nemotron-3-8b-chat" 
    | "nemotron-3-8b-qa" 
    | "nemotron-3-8b-base" 
    | "nemotron-3-8b-instruct" 
    | "nemotron-3-8b-summarize" 
    | "nemotron-3-8b-code" 
    | "nemotron-3-nano-30b"
    | "nemotron-3-super-120b"
    | "llama-3-nemotron-70b" 
    | "llama-nemotron-ultra-253b"
    | "custom";
  customModelId: string;
  servingFramework: "vllm" | "nim" | "triton";
  gpuType: "nvidia-l4" | "nvidia-a100-40gb" | "nvidia-a100-80gb" | "nvidia-h100-80gb" | "nvidia-t4";
  gpuCount: number;
  gkeType: " autopilot" | "standard";
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
