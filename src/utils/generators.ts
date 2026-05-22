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

export function getModelInfo(config: GKEConfig): { id: string; size: number; name: string } {
  switch (config.modelType) {
    case "nemotron-3-8b-chat":
      return {
        id: "nvidia/nemotron-3-8b-chat-1.1",
        size: 16,
        name: "Nemotron-3 8B Chat 1.1",
      };
    case "nemotron-3-8b-qa":
      return {
        id: "nvidia/nemotron-3-8b-qa-4k",
        size: 16,
        name: "Nemotron-3 8B Question-Answering 4k",
      };
    case "nemotron-3-8b-base":
      return {
        id: "nvidia/nemotron-3-8b-base",
        size: 16,
        name: "Nemotron-3 8B Foundational Base",
      };
    case "nemotron-3-8b-instruct":
      return {
        id: "nvidia/nemotron-3-8b-instruct",
        size: 16,
        name: "Nemotron-3 8B Instruct",
      };
    case "nemotron-3-8b-summarize":
      return {
        id: "nvidia/nemotron-3-8b-summarize-4k",
        size: 16,
        name: "Nemotron-3 8B Summarize-4k",
      };
    case "nemotron-3-8b-code":
      return {
        id: "nvidia/nemotron-3-8b-code-4k",
        size: 16,
        name: "Nemotron-3 8B Programming Code-4k",
      };
    case "llama-3-nemotron-70b":
      return {
        id: "nvidia/Llama-3-Nemotron-70B-Instruct",
        size: 140,
        name: "Llama-3 Nemotron 70B Instruct",
      };
    case "nemotron-3-nano-30b":
      return {
        id: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
        size: 60,
        name: "Nemotron-3 Nano 30B A3B",
      };
    case "nemotron-3-super-120b":
      return {
        id: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8",
        size: 120, // 120 GB in compressed FP8 format
        name: "Nemotron-3 Super 120B A12B FP8",
      };
    case "llama-nemotron-ultra-253b":
      return {
        id: "nvidia/Llama-Nemotron-Ultra-253B",
        size: 506,
        name: "Llama Nemotron Ultra 253B",
      };
    default:
      return {
        id: config.customModelId || "my-custom-org/nemotron-model",
        size: 32, // baseline guess
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

  // 3. secrets.yaml
  if (config.useHuggingFaceToken || config.useNGCKey) {
    files.push({
      name: "gke-secrets.yaml",
      language: "yaml",
      description: "Kubernetes Secret template to hold Hugging Face Hub token or Nvidia NGC credentials securely.",
      content: generateSecretsYaml(config)
    });
  }

  // 4. pv-claim.yaml or Storage-spec (PVC)
  if (config.storageType === "pvc") {
    files.push({
      name: "gke-pvc.yaml",
      language: "yaml",
      description: "Persistent Volume Claim specifying high-speed SSD provision for model weights caching.",
      content: generatePvcYaml(config)
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
    volumesBlock = `      volumes:
      - name: gcs-bucket
        csi:
          driver: gcsfuse.csi.storage.gke.io
          readOnly: false
          volumeAttributes:
            bucketName: "${config.gcsBucketName || "my-gke-nemotron-weights"}"
            mountOptions: "implicit-dirs"`;
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

  // Annotations
  let annotationsBlock = "";
  if (config.storageType === "gcs-fuse") {
    annotationsBlock = `      annotations:
        gke-gcsfuse/volumes: "true"
        gke-gcsfuse/cpu-limit: "3"
        gke-gcsfuse/memory-limit: "6Gi"`;
  }

  if (config.enableWorkloadIdentity) {
    const annotGcs = config.storageType === "gcs-fuse" ? `\n        iam.gke.io/gke-metadata-server-enabled: "true"` : "";
    annotationsBlock = `      annotations:${annotGcs}
        # Required for authenticating safely against Google Cloud services without keys
        iam.gke.io/gke-metadata-server-enabled: "true"`;
  }

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
    // NVIDIA NIM deployment
    containerImage = `nvcr.io/nim/nvidia/${config.modelType}-chat:latest`;
    if (config.modelType === "custom") {
      containerImage = `nvcr.io/nim/nvidia/nemotron-3-8b-chat:latest`; // default custom
    }
    containerArgs = `        # NIM auto-optimizes based on the accessible GPUs and volume caches
        args:
        - "nim_server"`;
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

  // CPU and Memory baseline requests
  const cpuCount = config.gpuCount * 12;
  const memCount = config.gpuCount * 48; // GKE recommendations is large ram for gpu machines

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
        app: nemotron-service\n${annotationsBlock ? annotationsBlock + "\n" : ""}\n    spec:
      containers:
      - name: llm-engine
        image: ${containerImage}
${containerArgs}
${containerPorts}
        resources:
          # CPU & Memory guidelines optimized for model weights loaded in VRAM
          requests:
            cpu: "${cpuCount || 8}"
            memory: "${memCount || 32}Gi"
            nvidia.com/gpu: "${resourceGpus}"
          limits:
            cpu: "${cpuCount || 8}"
            memory: "${memCount || 32}Gi"
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

function generateSecretsYaml(config: GKEConfig): string {
  let dataLines = "";
  if (config.useHuggingFaceToken) {
    dataLines += `  # base64 encoded token: echo -n "YOUR_HF_TOKEN" | base64\n  hf-token: cGxhY2Vob2xkZXJfdG9rZW5fZXhhbXBsZQ== # Replace with real base64 value\n`;
  }
  if (config.useNGCKey || config.servingFramework === "nim") {
    dataLines += `  # base64 encoded API Key: echo -n "YOUR_NGC_KEY" | base64\n  ngc-api-key: cGxhY2Vob2xkZXJfbmdjX2tleV9leGFtcGxl # Replace with real base64 value\n`;
  }

  return `apiVersion: v1
kind: Secret
metadata:
  name: nemotron-secrets
  namespace: ${config.namespace || "default"}
type: Opaque
data:
${dataLines}`;
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

  let clusterCommand = "";
  if (isAutopilot) {
    clusterCommand = `# Create a GKE Autopilot cluster loaded with GPU support
gcloud container clusters create-auto nemotron-cluster \\
    --region us-central1 \\
    --project=\$PROJECT_ID`;
  } else {
    clusterCommand = `# Create a GKE Standard cluster with a dynamic GPU Node Pool
# First create the minimal cluster manager control plane
gcloud container clusters create nemotron-cluster \\
    --zone us-central1-a \\
    --num-nodes=1 \\
    --machine-type=e2-standard-4 \\
    --project=\$PROJECT_ID

# Create a dedicated high-throughput GPU Node pool accommodating your configuration
gcloud container node-pools create nemotron-gpu-pool \\
    --cluster=nemotron-cluster \\
    --zone=us-central1-a \\
    --machine-type=${mType} \\
    --accelerator=type=${gpuDomain},count=${config.gpuCount} \\
    --num-nodes=1 \\
    --project=\$PROJECT_ID \\
    --scopes=https://www.googleapis.com/auth/cloud-platform \\
    --enable-autoscaling --min-nodes=0 --max-nodes=2`;
  }

  let secretsShellBlock = "";
  if (config.useHuggingFaceToken || config.useNGCKey) {
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
`;
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
