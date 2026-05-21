import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize server-side Gemini client with proper telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Interactive GKE Deployment Assistant Proxy
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt parameter." });
    }

    const configContext = config
      ? `The user is designing a GKE Kubernetes deployment for Nemotron-3 model. Current Parameters chosen:
- Model version: ${config.modelType} (Custom HF ID: ${config.customModelId || "N/A"})
- Serving framework engine: ${config.servingFramework}
- Accelerator GPU: ${config.gpuCount}x ${config.gpuType}
- Storage volume backend: ${config.storageType} (Bucket: ${config.gcsBucketName || "N/A"}, Disk Size: ${config.pvcSize} GB)
- GKE execution style: ${config.gkeType}
- K8s Namespace: ${config.namespace}
- Service Type: ${config.serviceType}
- Security Options: Hugging Face Token (${config.useHuggingFaceToken ? "ON" : "OFF"}), NVIDIA NGC Key (${config.useNGCKey ? "ON" : "OFF"}), Workload Identity (${config.enableWorkloadIdentity ? "ON" : "OFF"})`
      : "The user is asking generally about Nemotron-3 deployments.";

    const systemInstruction = `You are a Google Kubernetes Engine (GKE) DevOps Specialist and LLM Architect.
Your core goal is to help software engineers configure, deploy, scale, and troubleshoot their NVIDIA Nemotron-3, Triton Inference Server, vLLM, and NIM deployments on GKE.

Guidelines:
1. Provide extremely precise, authentic, and highly technical yet concise responses (less than 405 words).
2. Answer specifically within the context of the user's GKE configuration (which will be provided below).
3. If they ask for CLI commands (like creating clusters, allocating node pools), provide matching secure gcloud commands (e.g., specifying machine-type, accelerators).
4. Utilize direct formatting, bolding, and bullet points where useful, but do NOT provide overly wordy explanations.
5. If some features selected are incompatible (e.g. Triton/vLLM without proper secrets, or GCS Fuse mount without Workload Identity), warn them politely and give solutions.

Context of current configuration:
${configContext}`;

    // Call Gemini using the recommended model for Complex Text/Coding tasks: gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    const reply = response.text || "I was unable to formulate a response. Let us try adjusting the prompt.";
    return res.json({ reply });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return res.status(500).json({
      error: "An error occurred with the Gemini engine on the server side.",
      details: error.message || String(error)
    });
  }
});

// Server-side healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite as a middleware handler for development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the compiled 'dist' output directory
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Live developer container active on port: ${PORT} (http://0.0.0.0:${PORT})`);
  });
}

startServer();
