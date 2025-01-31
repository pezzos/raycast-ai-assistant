import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const WHISPER_MODELS = {
  tiny: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
  base: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
  small: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
  medium: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
};

const WHISPER_DIR = path.join(os.homedir(), ".raycast-whisper");
const WHISPER_MODELS_DIR = path.join(WHISPER_DIR, "models");
const WHISPER_BIN_DIR = path.join(WHISPER_DIR, "bin");

/**
 * Ensure all necessary directories exist
 */
async function ensureDirectories() {
  if (!fs.existsSync(WHISPER_DIR)) {
    fs.mkdirSync(WHISPER_DIR);
  }
  if (!fs.existsSync(WHISPER_MODELS_DIR)) {
    fs.mkdirSync(WHISPER_MODELS_DIR);
  }
  if (!fs.existsSync(WHISPER_BIN_DIR)) {
    fs.mkdirSync(WHISPER_BIN_DIR);
  }
}

/**
 * Check if Whisper is installed locally
 */
export async function isWhisperInstalled(): Promise<boolean> {
  const whisperPath = path.join(WHISPER_BIN_DIR, "whisper");
  return fs.existsSync(whisperPath);
}

/**
 * Check if a specific Whisper model is downloaded
 */
export function isModelDownloaded(model: string): boolean {
  const modelPath = path.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);
  return fs.existsSync(modelPath);
}

/**
 * Install Whisper locally
 */
export async function installWhisper(): Promise<void> {
  await ensureDirectories();

  await showHUD("🔄 Installing Whisper...");

  try {
    // Clone whisper.cpp repository
    await execAsync(`git clone https://github.com/ggerganov/whisper.cpp.git ${WHISPER_BIN_DIR}/whisper.cpp`);

    // Build whisper
    await execAsync(`cd ${WHISPER_BIN_DIR}/whisper.cpp && make`);

    // Create symlink to the main binary
    await execAsync(`ln -s ${WHISPER_BIN_DIR}/whisper.cpp/main ${WHISPER_BIN_DIR}/whisper`);

    await showHUD("✅ Whisper installed successfully!");
  } catch (error) {
    console.error("Error installing Whisper:", error);
    throw new Error("Failed to install Whisper");
  }
}

/**
 * Download a specific Whisper model
 */
export async function downloadModel(model: string): Promise<void> {
  if (!WHISPER_MODELS[model as keyof typeof WHISPER_MODELS]) {
    throw new Error(`Invalid model: ${model}`);
  }

  await ensureDirectories();

  const modelUrl = WHISPER_MODELS[model as keyof typeof WHISPER_MODELS];
  const modelPath = path.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);

  await showHUD(`🔄 Downloading ${model} model...`);

  try {
    await execAsync(`curl -L ${modelUrl} -o ${modelPath}`);
    await showHUD("✅ Model downloaded successfully!");
  } catch (error) {
    console.error("Error downloading model:", error);
    throw new Error("Failed to download model");
  }
}

/**
 * Transcribe audio using local Whisper
 */
export async function transcribeAudio(audioPath: string, model: string, language?: string): Promise<string> {
  if (!await isWhisperInstalled()) {
    throw new Error("Whisper is not installed");
  }

  if (!isModelDownloaded(model)) {
    throw new Error(`Model ${model} is not downloaded`);
  }

  const modelPath = path.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);
  const whisperPath = path.join(WHISPER_BIN_DIR, "whisper");

  try {
    const { stdout } = await execAsync(
      `${whisperPath} -m ${modelPath} -f ${audioPath}${language ? ` -l ${language}` : ""}`
    );

    return stdout.trim();
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

/**
 * Get the list of downloaded models
 */
export function getDownloadedModels(): string[] {
  if (!fs.existsSync(WHISPER_MODELS_DIR)) {
    return [];
  }

  return fs.readdirSync(WHISPER_MODELS_DIR)
    .filter(file => file.startsWith("ggml-") && file.endsWith(".bin"))
    .map(file => file.replace("ggml-", "").replace(".bin", ""));
}

/**
 * Get the list of available models
 */
export function getAvailableModels(): string[] {
  return Object.keys(WHISPER_MODELS);
}

/**
 * Clean up old model files (not used in last 30 days)
 */
export async function cleanupOldModels(): Promise<void> {
  if (!fs.existsSync(WHISPER_MODELS_DIR)) {
    return;
  }

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  const files = fs.readdirSync(WHISPER_MODELS_DIR);
  for (const file of files) {
    const filePath = path.join(WHISPER_MODELS_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.atimeMs < thirtyDaysAgo) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up old model: ${file}`);
    }
  }
}
