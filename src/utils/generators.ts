import { GKEConfig, GeneratedFile } from "../types";

export function getGPUVram(gpuType: string): number {
  switch (gpuType) {
    case "nvidia-l4":
      return 24;
    case "nvidia-a100-40gb":
      return 40;
    case "nvidia-a100-80gb":
      return 80;
    case "nvidia-h100-80gb":
      return 80;
    case "nvidia-t4":
      return 16;
    default:
      return 0;
  }
}

export function getGPUDomainName(gpuType: string): string {
  switch (gpuType) {
    case "nvidia-l4":
      return "nvidia-l4";
    case "nvidia-a100-40gb":
      return "nvidia-tesla-a100";
    case "nvidia-a100-80gb":
      return "nvidia-a100-80gb";
    case "nvidia-h100-80gb":
      return "nvidia-h100-80gb";
    case "nvidia-t4":
      return "nvidia-tesla-t4";
    default:
      return "nvidia-l4";
  }
}

// Node vCPU/memory totals for each (gpuType, gpuCount). Values are the
// raw machine-type capacity; getPodResources() trims headroom from these
// for the pod's CPU/memory requests so daemonsets and the GCS-FUSE sidecar
// have room to schedule.
const NODE_CAPACITY: Record<string, Record<number, [number, number]>> = {
  "nvidia-l4":          { 1: [12, 48],  2: [24, 96],  4: [48, 192], 8: [96, 384] },
  "nvidia-a100-40gb":   { 1: [12, 85],  2: [24, 170], 4: [48, 340], 8: [96, 680] },
  "nvidia-a100-80gb":   { 1: [12, 170], 2: [24, 340], 4: [48, 680], 8: [96, 1360] },
  "nvidia-h100-80gb":   { 1: [26, 234], 2: [52, 468], 4: [104, 936], 8: [208, 1872] },
  "nvidia-t4":          { 1: [4, 15],   2: [8, 30],   4: [16, 60],  8: [32, 120] },
};

// Reserve 2 vCPU + 6Gi of memory for kube-system, CSI drivers, and the
// gcsfuse sidecar so the LLM pod can actually schedule.
const CPU_HEADROOM = 2;
const MEM_HEADROOM_GI = 6;

export function getPodResources(gpuType: string, gpuCount: number): { cpu: number; memoryGi: number } {
  const node = NODE_CAPACITY[gpuType]?.[gpuCount];
  if (!node) return { cpu: 8, memoryGi: 32 };
  return {
    cpu: Math.max(node[0] - CPU_HEADROOM, 1),
    memoryGi: Math.max(node[1] - MEM_HEADROOM_GI, 8),
  };
}

export function getMachineTypeRecommendation(gpuType: string, gpuCount: number): string {
  switch (gpuType) {
    case "nvidia-l4":
      return `g2-standard-${gpuCount * 12}`; // e.g. g2-standard-12 for 1x L4, g2-standard-24 for 2x L4
    case "nvidia-a100-40gb":
      return `a2-highgpu-${gpuCount}g`;      // e.g. a2-highgpu-1g for 1x A100
    case "nvidia-a100-80gb":
      return `a2-ultragpu-${gpuCount}g`;
    case "nvidia-h100-80gb":
      return `a3-highgpu-${gpuCount}g`;
    case "nvidia-t4":
      return `n1-standard-${gpuCount * 4}`;
    default:
      return "g2-standard-12";
  }
}

// NIM container catalog. Paths verified May 2026 against build.nvidia.com
// and the NVIDIA developer forums. For modelTypes not in this map the
// deployment is emitted with a placeholder image + warning comment and
// the UI surfaces a banner advising the user to switch to vLLM or Triton.
//
// Where a single NIM serves multiple precision variants via internal
// profiles (e.g. Nemotron-3 Nano 30B-A3B), both modelType keys point at
// the same image - the container selects BF16/FP8 at startup.
const NIM_CATALOG: Partial<Record<GKEConfig["modelType"], string>> = {
  "llama-3-1-nemotron-nano-8b":          "nvcr.io/nim/nvidia/llama-3.1-nemotron-nano-8b-v1:latest",
  "llama-3-3-nemotron-super-49b":        "nvcr.io/nim/nvidia/llama-3.3-nemotron-super-49b-v1:latest",
  "llama-3-1-nemotron-70b":              "nvcr.io/nim/nvidia/llama-3.1-nemotron-70b-instruct:latest",
  "nemotron-3-nano-30b-a3b-bf16":        "nvcr.io/nim/nvidia/nemotron-3-nano:latest",
  "nemotron-3-nano-30b-a3b-fp8":         "nvcr.io/nim/nvidia/nemotron-3-nano:latest",
  "nemotron-3-nano-omni-30b-a3b":        "nvcr.io/nim/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:latest",
  "nemotron-3-super-120b-a12b-nvfp4":    "nvcr.io/nim/nvidia/nemotron-3-super-120b-a12b:1.8.0-variant",
};

export function getNimImage(modelType: GKEConfig["modelType"]): { image: string; supported: boolean } {
  const img = NIM_CATALOG[modelType];
  if (img) return { image: img, supported: true };
  return { image: "nvcr.io/nim/nvidia/PLACEHOLDER-NO-NIM-PUBLISHED:latest", supported: false };
}

// Size = approximate on-disk / VRAM-resident weight footprint in GB.
// Heuristic: BF16/FP16 ~= 2 * params, FP8 ~= 1 * params, NVFP4 ~= 0.5 * params.
export function getModelInfo(config: GKEConfig): { id: string; size: number; name: string } {
  switch (config.modelType) {
    case "nemotron-3-nano-4b":
      return {
        id: "nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16",
        size: 8,
        name: "Nemotron-3 Nano 4B (BF16)",
      };
    case "nemotron-3-nano-30b-a3b-bf16":
      return {
        id: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16",
        size: 60,
        name: "Nemotron-3 Nano 30B-A3B (BF16)",
      };
    case "nemotron-3-nano-30b-a3b-fp8":
      return {
        id: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8",
        size: 30,
        name: "Nemotron-3 Nano 30B-A3B (FP8)",
      };
    case "nemotron-3-nano-omni-30b-a3b":
      return {
        id: "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16",
        size: 60,
        name: "Nemotron-3 Nano Omni 30B-A3B Reasoning (BF16)",
      };
    case "nemotron-3-super-120b-a12b-nvfp4":
      return {
        id: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4",
        size: 60,
        name: "Nemotron-3 Super 120B-A12B (NVFP4)",
      };
    case "llama-3-1-nemotron-nano-8b":
      return {
        id: "nvidia/Llama-3.1-Nemotron-Nano-8B-v1",
        size: 16,
        name: "Llama-3.1-Nemotron Nano 8B v1",
      };
    case "llama-3-3-nemotron-super-49b":
      return {
        id: "nvidia/Llama-3.3-Nemotron-Super-49B-v1",
        size: 98,
        name: "Llama-3.3-Nemotron Super 49B v1",
      };
    case "llama-3-1-nemotron-70b":
      return {
        id: "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
        size: 140,
        name: "Llama-3.1-Nemotron 70B Instruct",
      };
    case "llama-3-1-nemotron-ultra-253b":
      return {
        id: "nvidia/Llama-3.1-Nemotron-Ultra-253B-v1",
        size: 506,
        name: "Llama-3.1-Nemotron Ultra 253B v1",
      };
    default:
      return {
        id: config.customModelId || "my-custom-org/nemotron-model",
        size: 32,
        name: "Custom Nemotron-based LLM",
      };
  }
}

export function generateAllFiles(config: GKEConfig): GeneratedFile[] {
  const modelInfo = getModelInfo(config);
  const isAutopilot = config.gkeType === "autopilot";
  
  const files: GeneratedFile[] = [];

  // 1. deployment.yaml
  files.push({
    name: "gke-deployment.yaml",
    language: "yaml",
    description: "Core Kubernetes Deployment defining Pod replicas, containers, GPU requests, and volume mounts.",
    content: generateDeploymentYaml(config, modelInfo, isAutopilot)
  });

  // 2. service.yaml
  files.push({
    name: "gke-service.yaml",
    language: "yaml",
    description: "Service file for exposing the LLM API endpoint internally or via an external LoadBalancer.",
    content: generateServiceYaml(config)
  });

  // 3. (no secrets.yaml) - secrets are created by deploy.sh via
  // 'kubectl create secret generic --from-literal=...' so the API tokens
  // never land in a YAML file that might get committed.

  // 4. pv-claim.yaml or Storage-spec (PVC)
  if (config.storageType === "pvc") {
    files.push({
      name: "gke-pvc.yaml",
      language: "yaml",
      description: "Persistent Volume Claim specifying high-speed SSD provision for model weights caching.",
      content: generatePvcYaml(config)
    });
  }

  // 4a. HPA + PDB for production resilience (opt-in)
  if (config.enableScaling) {
    files.push({
      name: "gke-hpa.yaml",
      language: "yaml",
      description: "HorizontalPodAutoscaler scaling 1-4 replicas on CPU. See comments for a GPU duty-cycle alternative.",
      content: generateHpaYaml(config),
    });
    files.push({
      name: "gke-pdb.yaml",
      language: "yaml",
      description: "PodDisruptionBudget keeping at least one inference pod available during node drains and upgrades.",
      content: generatePdbYaml(config),
    });
  }

  // 4b. ServiceAccount (KSA) for Workload Identity.
  // Required whenever the pod needs to authenticate to GCP APIs - explicit
  // WI opt-in, or GCS-FUSE (which authenticates the bucket mount via WI).
  if (config.enableWorkloadIdentity || config.storageType === "gcs-fuse") {
    files.push({
      name: "gke-serviceaccount.yaml",
      language: "yaml",
      description: "Kubernetes ServiceAccount annotated to impersonate a GCP IAM service account via Workload Identity.",
      content: generateServiceAccountYaml(config)
    });
  }

  // 5. deploy.sh
  files.push({
    name: "deploy.sh",
    language: "bash",
    description: "A complete shell script containing Google Cloud SDK commands to configure GKE and deploy the manifests.",
    content: generateBashScript(config, modelInfo, isAutopilot)
  });

  // 6. test-inference.sh
  files.push({
    name: "test-inference.sh",
    language: "bash",
    description: "Interative test script utilizing standard cURL commands to verify text completion and model performance.",
    content: generateTestScript(config)
  });

  return files;
}

function generateDeploymentYaml(config: GKEConfig, modelInfo: { id: string; size: number; name: string }, isAutopilot: boolean): string {
  const isNim = config.servingFramework === "nim";
  const isVllm = config.servingFramework === "vllm";
  
  const gpuLabel = getGPUDomainName(config.gpuType);
  const resourceGpus = config.gpuCount;
  
  // Storage Volumes and VolumeMounts
  let volumesBlock = "";
  let volumeMountsBlock = "";

  if (config.storageType === "pvc") {
    volumesBlock = `      volumes:
      - name: cache-volume
        persistentVolumeClaim:
          claimName: nemotron-weights-pvc`;
    volumeMountsBlock = `        volumeMounts:
        - name: cache-volume
          mountPath: /data`;
  } else if (config.storageType === "gcs-fuse") {
    // The 'gke-gcsfuse-cache' emptyDir is the name the sidecar expects for
    // its file cache. file-cache:max-size-mb:-1 lets the cache grow to fill
    // the volume. metadata-cache:ttl-secs:60 helps cold-start latency on
    // large model directories. See:
    //   https://cloud.google.com/storage/docs/cloud-storage-fuse/file-cache
    volumesBlock = `      volumes:
      - name: gcs-bucket
        csi:
          driver: gcsfuse.csi.storage.gke.io
          readOnly: false
          volumeAttributes:
            bucketName: "${config.gcsBucketName || "my-gke-nemotron-weights"}"
            mountOptions: "implicit-dirs,file-cache:max-size-mb:-1,metadata-cache:ttl-secs:60"
      - name: gke-gcsfuse-cache
        emptyDir:
          medium: Memory
          sizeLimit: 64Gi`;
    volumeMountsBlock = `        volumeMounts:
        - name: gcs-bucket
          mountPath: /data`;
  } else {
    // empty-dir
    volumesBlock = `      volumes:
      - name: cache-volume
        emptyDir:
          # Set medium to Memory only for small weights or high-RAM machines
          medium: Memory`;
    if (config.gpuType === "nvidia-l4") {
      volumesBlock = `      volumes:
      - name: cache-volume
        emptyDir: {}`;
    }
    volumeMountsBlock = `        volumeMounts:
        - name: cache-volume
          mountPath: /data`;
  }

  // Pod-template annotations. Workload Identity is *not* an annotation on
  // the pod - it's the KSA reference (serviceAccountName below) plus the
  // KSA's iam.gke.io/gcp-service-account annotation (emitted by
  // generateServiceAccountYaml). Only GCS-FUSE keeps annotations here.
  let annotationsBlock = "";
  if (config.storageType === "gcs-fuse") {
    annotationsBlock = `      annotations:
        gke-gcsfuse/volumes: "true"
        gke-gcsfuse/cpu-limit: "4"
        gke-gcsfuse/memory-limit: "8Gi"
        gke-gcsfuse/ephemeral-storage-limit: "64Gi"`;
  }

  // serviceAccountName line - set when WI is on OR GCS-FUSE is in use
  // (GCS-FUSE needs a WI-bound KSA to authenticate to the bucket).
  const useKsa = config.enableWorkloadIdentity || config.storageType === "gcs-fuse";
  const serviceAccountLine = useKsa ? `      serviceAccountName: nemotron-sa\n` : "";

  // imagePullSecrets - NIM containers live on nvcr.io which requires auth.
  // deploy.sh creates the docker-registry secret 'nvcr-pull-secret' below.
  const imagePullSecretsBlock = config.servingFramework === "nim"
    ? `      imagePullSecrets:\n      - name: nvcr-pull-secret\n`
    : "";

  // Image & Startup commands based on serving framework
  let containerImage = "";
  let containerArgs = "";
  let containerPorts = "";
  let envVars = "";

  if (isVllm) {
    // v0.12 release tag recommended by the vLLM Nemotron recipes
    containerImage = "vllm/vllm-openai:deploy";
    containerArgs = `        args:
        - "--model"
        - "${modelInfo.id}"
        - "--tensor-parallel-size"
        - "${config.gpuCount}"
        - "--download-dir"
        - "/data"
        - "--port"
        - "8000"`;
    containerPorts = `        ports:
        - containerPort: 8000
          name: api`;
    
    let envsList = "";
    if (config.useHuggingFaceToken) {
      envsList += `
        - name: HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: nemotron-secrets
              key: hf-token`;
    }
    envsList += `\n        - name: VLLM_CACHE_DIR\n          value: "/data"`;
    envVars = `        env:${envsList}`;
  } else if (isNim) {
    // NIM containers ship an ENTRYPOINT that starts the OpenAI-compatible
    // server; we only need to set the image. Args are intentionally empty.
    const nim = getNimImage(config.modelType);
    containerImage = nim.image;
    containerArgs = nim.supported
      ? `        # NIM auto-optimizes based on the accessible GPUs and volume caches`
      : `        # WARNING: no published NIM container exists for ${config.modelType}.
        # Replace 'image:' above with a valid nvcr.io/nim path, or switch
        # the Serving Framework to vLLM or Triton in the generator UI.`;
    containerPorts = `        ports:
        - containerPort: 8000
          name: openai-api`;
    
    let envsList = `
        - name: NGC_API_KEY
          valueFrom:
            secretKeyRef:
              name: nemotron-secrets
              key: ngc-api-key
        - name: NIM_CACHE_PATH
          value: "/data"`;
    if (config.useHuggingFaceToken) {
      envsList += `
        - name: HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: nemotron-secrets
              key: hf-token`;
    }
    envVars = `        env:${envsList}`;
  } else {
    // Triton Inference Server
    containerImage = "nvcr.io/nvidia/tritonserver:24.03-py3";
    containerArgs = `        command: ["tritonserver"]
        args:
        - "--model-repository=/data/models"
        - "--allow-gpu-metrics=true"
        - "--metrics-port=8002"`;
    containerPorts = `        ports:
        - containerPort: 8000
          name: http-api
        - containerPort: 8001
          name: grpc-api
        - containerPort: 8002
          name: metrics`;
    
    let envsList = `
        - name: MODEL_NAME
          value: "${modelInfo.id}"`;
    if (config.useNGCKey) {
      envsList += `
        - name: NGC_API_KEY
          valueFrom:
            secretKeyRef:
              name: nemotron-secrets
              key: ngc-api-key`;
    }
    envVars = `        env:${envsList}`;
  }

  // Node Selection, Tolerations & NodeSelector
  let constraintsBlock = "";
  if (!isAutopilot) {
    constraintsBlock = `      nodeSelector:
        cloud.google.com/gke-accelerator: ${gpuLabel}
      tolerations:
      - key: "nvidia.com/gpu"
        operator: "Exists"
        effect: "NoSchedule"`;
  } else {
    constraintsBlock = `      # GKE Autopilot automatically provisions nodes based on resource limits below.
      # No manual tolerations or nodeSelectors needed.`;
  }

  // CPU/memory requests derived from the actual machine-type capacity
  // for this (gpuType, gpuCount), minus headroom for daemonsets/sidecars.
  const { cpu: cpuCount, memoryGi: memCount } = getPodResources(config.gpuType, config.gpuCount);

  const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nemotron-deployment
  namespace: ${config.namespace || "default"}
  labels:
    app: nemotron-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nemotron-service
  template:
    metadata:
      labels:
        app: nemotron-service\n${annotationsBlock ? annotationsBlock + "\n" : ""}    spec:
${serviceAccountLine}${imagePullSecretsBlock}      containers:
      - name: llm-engine
        image: ${containerImage}
${containerArgs}
${containerPorts}
        resources:
          # CPU & Memory guidelines optimized for model weights loaded in VRAM
          requests:
            cpu: "${cpuCount}"
            memory: "${memCount}Gi"
            nvidia.com/gpu: "${resourceGpus}"
          limits:
            cpu: "${cpuCount}"
            memory: "${memCount}Gi"
            nvidia.com/gpu: "${resourceGpus}"
${envVars}
${volumeMountsBlock}
${constraintsBlock}
${volumesBlock}
`;

  return manifest;
}

function generateServiceYaml(config: GKEConfig): string {
  const isTriton = config.servingFramework === "triton";
  
  let ports = `  - port: 80
    targetPort: 8000
    name: http-api`;
    
  if (isTriton) {
    ports += `
  - port: 8001
    targetPort: 8001
    name: grpc-api
  - port: 8002
    targetPort: 8002
    name: metrics`;
  }

  return `apiVersion: v1
kind: Service
metadata:
  name: nemotron-service
  namespace: ${config.namespace || "default"}
  labels:
    app: nemotron-service
spec:
  type: ${config.serviceType}
  selector:
    app: nemotron-service
  ports:
${ports}
`;
}

function generateHpaYaml(config: GKEConfig): string {
  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nemotron-hpa
  namespace: ${config.namespace || "default"}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nemotron-deployment
  minReplicas: 1
  maxReplicas: 4
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # For GPU duty-cycle scaling, install the Custom Metrics Stackdriver
  # Adapter and uncomment:
  # - type: External
  #   external:
  #     metric:
  #       name: kubernetes.io|container|accelerator|duty_cycle
  #       selector:
  #         matchLabels:
  #           resource.labels.namespace_name: ${config.namespace || "default"}
  #     target:
  #       type: AverageValue
  #       averageValue: "70"
`;
}

function generatePdbYaml(config: GKEConfig): string {
  return `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: nemotron-pdb
  namespace: ${config.namespace || "default"}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: nemotron-service
`;
}

function generateServiceAccountYaml(config: GKEConfig): string {
  return `apiVersion: v1
kind: ServiceAccount
metadata:
  name: nemotron-sa
  namespace: ${config.namespace || "default"}
  annotations:
    # Bind this KSA to a GCP IAM service account. Create the GSA and the
    # workloadIdentityUser binding via deploy.sh, then replace the email below.
    iam.gke.io/gcp-service-account: nemotron-gsa@YOUR_PROJECT_ID.iam.gserviceaccount.com
`;
}

function generatePvcYaml(config: GKEConfig): string {
  // Use GKE premium standard storage class which supports fast SSD caching
  return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nemotron-weights-pvc
  namespace: ${config.namespace || "default"}
spec:
  accessModes:
    - ReadWriteOnce
  # GKE high-speed balanced SSD standard storage class
  storageClassName: premium-rwo
  resources:
    requests:
      storage: ${config.pvcSize || 200}Gi
`;
}

function generateBashScript(config: GKEConfig, modelInfo: { id: string; size: number; name: string }, isAutopilot: boolean): string {
  const gpuDomain = getGPUDomainName(config.gpuType);
  const mType = getMachineTypeRecommendation(config.gpuType, config.gpuCount);
  
  let gcsBucketSetup = "";
  if (config.storageType === "gcs-fuse") {
    gcsBucketSetup = `# 1. Create a GCS bucket to store your Nemotron model weights
gsutil mb -l us-central1 gs://${config.gcsBucketName || "my-gke-nemotron-weights"}

# If you need to copy weights before starting (optional):
# gsutil cp -r ./my-local-weights gs://${config.gcsBucketName || "my-gke-nemotron-weights"}/
`;
  }

  const useKsa = config.enableWorkloadIdentity || config.storageType === "gcs-fuse";

  let clusterCommand = "";
  if (isAutopilot) {
    // Autopilot enables Workload Identity by default - no extra flag required.
    clusterCommand = `# Create a GKE Autopilot cluster loaded with GPU support
gcloud container clusters create-auto nemotron-cluster \\
    --region us-central1 \\
    --project=\$PROJECT_ID`;
  } else {
    const wiClusterFlag = useKsa ? " \\\n    --workload-pool=\$PROJECT_ID.svc.id.goog" : "";
    const wiNodeFlag = useKsa ? " \\\n    --workload-metadata=GKE_METADATA" : "";
    clusterCommand = `# Create a GKE Standard cluster with a dynamic GPU Node Pool
# First create the minimal cluster manager control plane
gcloud container clusters create nemotron-cluster \\
    --zone us-central1-a \\
    --num-nodes=1 \\
    --machine-type=e2-standard-4 \\
    --project=\$PROJECT_ID${wiClusterFlag}

# Create a dedicated high-throughput GPU Node pool accommodating your configuration
gcloud container node-pools create nemotron-gpu-pool \\
    --cluster=nemotron-cluster \\
    --zone=us-central1-a \\
    --machine-type=${mType} \\
    --accelerator=type=${gpuDomain},count=${config.gpuCount} \\
    --num-nodes=1 \\
    --project=\$PROJECT_ID \\
    --scopes=https://www.googleapis.com/auth/cloud-platform \\
    --enable-autoscaling --min-nodes=0 --max-nodes=2${wiNodeFlag}`;
  }

  let wiSetupBlock = "";
  if (useKsa) {
    const gcsGrant = config.storageType === "gcs-fuse"
      ? `\n# Grant the GSA read/write on the model bucket
gcloud storage buckets add-iam-policy-binding gs://${config.gcsBucketName || "my-gke-nemotron-weights"} \\
    --member="serviceAccount:nemotron-gsa@\$PROJECT_ID.iam.gserviceaccount.com" \\
    --role="roles/storage.objectUser"\n`
      : "";
    wiSetupBlock = `
# ----------------------------------------------------
# Workload Identity: create GSA and bind it to the KSA
# (gke-serviceaccount.yaml provides the KSA side of the link)
# ----------------------------------------------------
gcloud iam service-accounts create nemotron-gsa \\
    --project=\$PROJECT_ID || echo "GSA already exists, continuing"

gcloud iam service-accounts add-iam-policy-binding \\
    nemotron-gsa@\$PROJECT_ID.iam.gserviceaccount.com \\
    --role="roles/iam.workloadIdentityUser" \\
    --member="serviceAccount:\$PROJECT_ID.svc.id.goog[\$NAMESPACE/nemotron-sa]"
${gcsGrant}
# Stamp the real GSA email into the KSA manifest before applying
sed -i.bak "s/YOUR_PROJECT_ID/\$PROJECT_ID/g" gke-serviceaccount.yaml
kubectl apply -f gke-serviceaccount.yaml
`;
  }

  let secretsShellBlock = "";
  if (config.useHuggingFaceToken || config.useNGCKey || config.servingFramework === "nim") {
    // For NIM workloads we need TWO secrets: nemotron-secrets (env-var
    // injection for NGC_API_KEY/HF_TOKEN) AND nvcr-pull-secret (docker
    // registry auth so the kubelet can pull from nvcr.io). Without the
    // pull secret NIM pods ErrImagePull regardless of NGC_API_KEY.
    const pullSecretBlock = config.servingFramework === "nim" ? `
echo "Creating docker-registry pull secret for nvcr.io..."
kubectl create secret docker-registry nvcr-pull-secret \\
    --namespace=${config.namespace || "default"} \\
    --docker-server=nvcr.io \\
    --docker-username='\$oauthtoken' \\
    --docker-password="YOUR_NVIDIA_NGC_API_KEY_HERE" \\
    --dry-run=client -o yaml | kubectl apply -f -
` : "";
    secretsShellBlock = `
# ----------------------------------------------------
# Define secrets (Hugging Face / NGC)
# ----------------------------------------------------
echo "Creating GKE secrets..."
kubectl create secret generic nemotron-secrets \\
    --namespace=${config.namespace || "default"} \\
    ${config.useHuggingFaceToken ? "--from-literal=hf-token=\"YOUR_HF_TOKEN_HERE\" \\" : ""}
    ${config.useNGCKey || config.servingFramework === "nim" ? "--from-literal=ngc-api-key=\"YOUR_NVIDIA_NGC_API_KEY_HERE\" \\" : ""}
    --dry-run=client -o yaml | kubectl apply -f -
${pullSecretBlock}`;
  }

  return `#!/bin/bash
# ==============================================================================
# GKE Deployment Script for Nemotron-3 (${modelInfo.name})
# Target Accelerator: ${config.gpuCount}x ${config.gpuType.toUpperCase()}
# Framework: ${config.servingFramework.toUpperCase()}
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
PROJECT_ID="YOUR_GCP_PROJECT_ID"
NAMESPACE="${config.namespace || "default"}"

if [ "\$PROJECT_ID" == "YOUR_GCP_PROJECT_ID" ]; then
  echo "Error: Please edit this deploy.sh and set your actual GCP PROJECT_ID!"
  exit 1
fi

echo "Deploying ${modelInfo.name} on GKE..."
gcloud config set project \$PROJECT_ID

${gcsBucketSetup}

# ----------------------------------------------------
# Allocate GKE Cluster
# ----------------------------------------------------
echo "Creating GKE Cluster (This may take 10-15 minutes)..."
${clusterCommand}

# Configure kubectl credentials for connection
gcloud container clusters get-credentials nemotron-cluster \\
    --zone us-central1-a --project=\$PROJECT_ID

# Create GKE standard namespace
kubectl create namespace \$NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
${wiSetupBlock}
${secretsShellBlock}

# ----------------------------------------------------
# Deploy Model Storage & Workloads
# ----------------------------------------------------
${config.storageType === "pvc" ? "echo \"Applying SSD Storage Claim...\"\nkubectl apply -f gke-pvc.yaml" : ""}

echo "Registering GPU deployment manifests..."
kubectl apply -f gke-deployment.yaml
kubectl apply -f gke-service.yaml

echo "Waiting for pods to boot..."
echo "To check logs, run: kubectl logs -l app=nemotron-service -f -n \$NAMESPACE"
kubectl get pods -n \$NAMESPACE --watch
`;
}

function generateTestScript(config: GKEConfig): string {
  const port = "80";

  let payloadStr = "";
  if (config.servingFramework === "triton") {
    // Triton speaks the KServe v2 protocol, not the OpenAI v1 schema
    payloadStr = `curl http://\$SERVICE_IP:${port}/v2/models/nemotron/ready`;
  } else {
    // OpenAI specification standard formats
    payloadStr = `curl -X POST http://\$SERVICE_IP:${port}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${getModelInfo(config).id}",
    "messages": [
      {"role": "system", "content": "You are a helpful software engineer deployed on Google Kubernetes Engine."},
      {"role": "user", "content": "Hello Nemotron! Verify that you are loaded on GKE!"}
    ],
    "temperature": 0.7
  }'`;
  }

  return `#!/bin/bash
# ==============================================================================
# Inference query checker for GKE Nemotron-3 service
# ==============================================================================

NAMESPACE="${config.namespace || "default"}"

echo "Fetching external LoadBalancer IP for the active Nemotron pod..."
SERVICE_IP=""
ATTEMPTS=0

while [ -z "\$SERVICE_IP" ] && [ \$ATTEMPTS -lt 15 ]; do
  # Retrieve Service endpoint ingress address
  SERVICE_IP=\$(kubectl get svc nemotron-service -n \$NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  if [ -z "\$SERVICE_IP" ]; then
    echo "Waiting for GKE LoadBalancer IP to be provisioned (Attempt \$ATTEMPTS/15)..."
    sleep 10
    ATTEMPTS=\$((ATTEMPTS+1))
  fi
done

if [ -z "\$SERVICE_IP" ]; then
  echo "LoadBalancer IP provision timed out."
  echo "You can query the pod internally using port-forwarding:"
  echo "  kubectl port-forward svc/nemotron-service 8000:80 -n \$NAMESPACE"
  echo "And then make your query to http://localhost:8000"
  SERVICE_IP="localhost:8000"
else
  echo "Service endpoint online at: \$SERVICE_IP"
fi

echo -e "\\nSending testing payload to GKE Service API...\\n"
${payloadStr}
echo -e "\\n"
`;
}
