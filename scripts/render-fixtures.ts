// Render YAML manifests for a representative matrix of GKEConfig combos,
// write them to /tmp/kubeconform-fixtures/<combo>/*.yaml, and pipe each
// dir through kubeconform for offline schema validation.
//
// Run with:  npx tsx scripts/render-fixtures.ts
//
// Exits non-zero if any combo fails schema validation. The matrix is
// curated (not full crossproduct) — pick a representative path through
// every code branch in generators.ts.

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { generateAllFiles } from "../src/utils/generators";
import { GKEConfig } from "../src/types";

type Fixture = { name: string; config: GKEConfig };

const base = {
  customModelId: "",
  pvcSize: 200,
  gcsBucketName: "my-bucket",
  namespace: "default",
  serviceType: "LoadBalancer" as const,
};

const fixtures: Fixture[] = [
  {
    name: "vllm-l4-emptydir-autopilot-minimal",
    config: { ...base, modelType: "nemotron-3-nano-4b", servingFramework: "vllm", gpuType: "nvidia-l4", gpuCount: 1, gkeType: "autopilot", storageType: "empty-dir", useHuggingFaceToken: true, useNGCKey: false, enableWorkloadIdentity: false, enableScaling: false },
  },
  {
    name: "vllm-a100-pvc-standard-no-extras",
    config: { ...base, modelType: "nemotron-3-nano-30b-a3b-bf16", servingFramework: "vllm", gpuType: "nvidia-a100-80gb", gpuCount: 2, gkeType: "standard", storageType: "pvc", useHuggingFaceToken: true, useNGCKey: false, enableWorkloadIdentity: false, enableScaling: false },
  },
  {
    name: "nim-h100-gcsfuse-autopilot-wi-scaling",
    config: { ...base, modelType: "llama-3-1-nemotron-70b", servingFramework: "nim", gpuType: "nvidia-h100-80gb", gpuCount: 2, gkeType: "autopilot", storageType: "gcs-fuse", useHuggingFaceToken: false, useNGCKey: true, enableWorkloadIdentity: true, enableScaling: true },
  },
  {
    name: "nim-unsupported-model-warning",
    config: { ...base, modelType: "nemotron-3-nano-4b", servingFramework: "nim", gpuType: "nvidia-l4", gpuCount: 1, gkeType: "autopilot", storageType: "empty-dir", useHuggingFaceToken: false, useNGCKey: true, enableWorkloadIdentity: false, enableScaling: false },
  },
  {
    name: "triton-a100-pvc-standard-no-wi",
    config: { ...base, modelType: "nemotron-3-nano-30b-a3b-fp8", servingFramework: "triton", gpuType: "nvidia-a100-40gb", gpuCount: 1, gkeType: "standard", storageType: "pvc", useHuggingFaceToken: false, useNGCKey: true, enableWorkloadIdentity: false, enableScaling: false },
  },
  {
    name: "triton-h100-gcsfuse-standard-wi",
    config: { ...base, modelType: "nemotron-3-super-120b-a12b-nvfp4", servingFramework: "triton", gpuType: "nvidia-h100-80gb", gpuCount: 4, gkeType: "standard", storageType: "gcs-fuse", useHuggingFaceToken: true, useNGCKey: true, enableWorkloadIdentity: true, enableScaling: false },
  },
  {
    name: "ultra-multinode-vllm-gcsfuse-autopilot",
    config: { ...base, modelType: "llama-3-1-nemotron-ultra-253b", servingFramework: "vllm", gpuType: "nvidia-h100-80gb", gpuCount: 8, gkeType: "autopilot", storageType: "gcs-fuse", useHuggingFaceToken: true, useNGCKey: false, enableWorkloadIdentity: true, enableScaling: true },
  },
  {
    name: "custom-model-t4-legacy-clusterip",
    config: { ...base, modelType: "custom", customModelId: "myorg/my-finetune", servingFramework: "vllm", gpuType: "nvidia-t4", gpuCount: 1, gkeType: "standard", storageType: "empty-dir", serviceType: "ClusterIP", useHuggingFaceToken: true, useNGCKey: false, enableWorkloadIdentity: false, enableScaling: false },
  },
];

const fixturesDir = "/tmp/kubeconform-fixtures";
rmSync(fixturesDir, { recursive: true, force: true });
mkdirSync(fixturesDir, { recursive: true });

let pass = 0;
let fail = 0;
const failureDetails: { name: string; output: string }[] = [];

for (const f of fixtures) {
  const dir = join(fixturesDir, f.name);
  mkdirSync(dir, { recursive: true });

  const files = generateAllFiles(f.config);
  const yamlFiles = files.filter((file) => file.language === "yaml");
  for (const file of yamlFiles) {
    writeFileSync(join(dir, file.name), file.content);
  }

  // -ignore-missing-schemas: GKE-specific CRDs (gcsfuse) aren't in the
  //   default schema set; we only want to validate core K8s API objects.
  // -strict: forbids unknown fields.
  // -summary: machine-readable single-line output per file.
  const cmd = `kubeconform -summary -strict -ignore-missing-schemas ${dir}/*.yaml`;
  try {
    const out = execSync(cmd, { encoding: "utf8" });
    console.log(`✓ ${f.name}  (${yamlFiles.length} files)`);
    console.log(`    ${out.trim().split("\n").join("\n    ")}`);
    pass++;
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; message: string };
    const stdout = err.stdout?.toString() ?? "";
    const stderr = err.stderr?.toString() ?? "";
    const output = (stdout + stderr + (stdout || stderr ? "" : err.message)).trim();
    console.log(`✗ ${f.name}  (${yamlFiles.length} files)`);
    console.log(`    ${output.split("\n").join("\n    ")}`);
    failureDetails.push({ name: f.name, output });
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`Fixtures retained at: ${fixturesDir}`);

if (fail > 0) {
  console.log("\nFailure details:");
  for (const f of failureDetails) {
    console.log(`\n--- ${f.name} ---\n${f.output}`);
  }
  process.exit(1);
}
