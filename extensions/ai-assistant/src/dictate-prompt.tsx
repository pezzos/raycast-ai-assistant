import { showHUD, getPreferenceValues, Clipboard, LocalStorage } from "@raycast/api";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { getLLMModel, getSelectedText, replaceSelectedText, cleanOutputText } from "./utils/common";
import {
  SILENCE_TIMEOUT_KEY,
  MUTE_DURING_DICTATION_KEY,
  USE_PERSONAL_DICTIONARY_KEY,
  WHISPER_MODE_KEY,
  TRANSCRIBE_MODEL_KEY,
  WHISPER_MODEL_KEY,
  PARAKEET_MODEL_KEY,
  LOCAL_ENGINE_KEY,
} from "./settings";
import { setSystemAudioMute, isSystemAudioMuted, getOptimizedAudioParams } from "./utils/audio";
import { measureTimeAdvanced } from "./utils/timing";
import { startPeriodicNotification, stopPeriodicNotification } from "./utils/timing";
import { addTranscriptionToHistory, getRecordingsToKeep } from "./utils/transcription-history";
import { getActiveApplication } from "./utils/active-app";
import { getPersonalDictionaryPrompt } from "./utils/dictionary";
import { isLocalTranscriptionAvailable, transcribeAudio, type ModelEngine } from "./utils/local-models";
import { performanceProfiler } from "./utils/performance-profiler";

const execAsync = promisify(exec);
const SOX_PATH = "/opt/homebrew/bin/sox";
const RECORDINGS_DIR = path.join(__dirname, "recordings");

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
  fixText: boolean;
}

interface Transcription {
  text: string;
}

/**
 * Clean up old recording files (older than 1 hour)
 * @param tempDir Directory containing the recordings
 * @param recordingsToKeep Set of recording paths to keep
 */
async function cleanupOldRecordings(tempDir: string, recordingsToKeep: Set<string>) {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (
        stats.mtimeMs < oneHourAgo &&
        file.startsWith("recording-") &&
        file.endsWith(".wav") &&
        !recordingsToKeep.has(filePath)
      ) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old recording: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up old recordings:", error);
  }
}

/**
 * Execute the prompt using OpenAI
 * @param prompt The prompt to execute
 * @param selectedText Optional selected text to include in the prompt
 * @param openai OpenAI instance
 * @param usePersonalDictionary Whether to use the personal dictionary
 * @returns Promise<string> The generated text
 */
async function executePrompt(
  prompt: string,
  selectedText: string | null,
  openai: OpenAI,
  usePersonalDictionary: boolean,
): Promise<string> {
  console.log("Executing prompt with:", { prompt, hasSelectedText: !!selectedText });

  const dictionaryPrompt = usePersonalDictionary ? await getPersonalDictionaryPrompt() : "";

  const systemPrompt = selectedText
    ? "You are an AI assistant that helps users modify text based on voice commands. Apply the user's prompt to modify the text. Respond ONLY with the modified text, without any explanations or context."
    : "You are an AI assistant that helps users generate text based on voice commands. Respond ONLY with the generated text, without any explanations or context.";

  const userPrompt = selectedText
    ? `Please modify the following text according to this instruction: "${prompt}"${
        dictionaryPrompt ? "\n\nPlease also apply these dictionary rules:\n" + dictionaryPrompt : ""
      }\n\nText to modify: "${selectedText}"`
    : `${prompt}${dictionaryPrompt ? "\n\nPlease apply these dictionary rules:\n" + dictionaryPrompt : ""}`;

  console.log("Sending to OpenAI:", {
    model: getLLMModel(),
    systemPrompt,
    userPrompt,
  });

  const completion = await openai.chat.completions.create({
    model: getLLMModel(),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.7,
  });

  const result = completion.choices[0].message.content?.trim() || "";
  console.log("OpenAI response:", { length: result.length, preview: result.substring(0, 100) });

  return result;
}

/**
 * Clean and process the transcribed prompt to extract the actual command
 * @param transcription The raw transcription from Whisper
 * @returns The cleaned prompt or null if it's just a request for text
 */

export default async function Command() {
  console.log("🎙️ Starting dictate-prompt command...");

  // Démarre le profiling de session
  await performanceProfiler.startSession("dictate-prompt");

  let originalMuteState = false;
  let muteDuringDictation = false;

  try {
    const preferences = getPreferenceValues<Preferences>();

    // Load settings from local storage

    const savedWhisperMode = await LocalStorage.getItem<string>(WHISPER_MODE_KEY);
    const whisperMode = savedWhisperMode || "transcribe";

    const savedTranscribeModel = await LocalStorage.getItem<string>(TRANSCRIBE_MODEL_KEY);
    const transcribeModel = savedTranscribeModel || "gpt-4o-mini-transcribe";

    const savedLocalEngine = await LocalStorage.getItem<string>(LOCAL_ENGINE_KEY);
    const localEngine = (savedLocalEngine as ModelEngine) || "whisper";

    const savedWhisperModel = await LocalStorage.getItem<string>(WHISPER_MODEL_KEY);
    const whisperModel = savedWhisperModel || "base";

    const savedParakeetModel = await LocalStorage.getItem<string>(PARAKEET_MODEL_KEY);
    const parakeetModel = savedParakeetModel || "parakeet-tdt-0.6b-v2";

    const savedUsePersonalDictionary = await LocalStorage.getItem<string>(USE_PERSONAL_DICTIONARY_KEY);
    const usePersonalDictionary = savedUsePersonalDictionary === "true";

    const savedMuteDuringDictation = await LocalStorage.getItem<string>(MUTE_DURING_DICTATION_KEY);
    muteDuringDictation = savedMuteDuringDictation === "true";

    const savedSilenceTimeout = await LocalStorage.getItem<string>(SILENCE_TIMEOUT_KEY);
    const silenceTimeout = savedSilenceTimeout || "2.0";

    // Check if local model is available if needed
    if (whisperMode === "local") {
      const currentModelId = localEngine === "whisper" ? whisperModel : parakeetModel;
      const isAvailable = await isLocalTranscriptionAvailable(localEngine, currentModelId);

      if (!isAvailable) {
        const engineName = localEngine === "whisper" ? "Whisper" : "Parakeet";
        throw new Error(
          `${engineName} engine or model ${currentModelId} is not available - Please install from the Local Models menu`,
        );
      }
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: preferences.openaiApiKey,
    });

    // Get selected text if any
    let selectedText: string | null = null;
    try {
      selectedText = await getSelectedText();
      if (selectedText) {
        console.log("Found selected text:", selectedText);
      } else {
        console.log("No text currently selected");
      }
    } catch (error) {
      // This is a normal case when there's just a cursor position without selection
      console.log("No text selected, will generate new text");
    }

    // Prepare recordings directory
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }

    // Clean up old recordings that are not in history
    const recordingsToKeep = await getRecordingsToKeep();
    await cleanupOldRecordings(RECORDINGS_DIR, recordingsToKeep);

    const outputPath = path.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);
    console.log("Recording will be saved to:", outputPath);

    // Handle audio muting if enabled
    if (muteDuringDictation) {
      originalMuteState = await isSystemAudioMuted();
      await setSystemAudioMute(true);
    }

    // Get optimized audio parameters and start recording with profiling
    const audioParams = await getOptimizedAudioParams();
    await showHUD(`🎙️ Recording... (will stop after ${audioParams.timeout}s of silence)`);
    console.log("Starting recording...");

    const audioLength = await measureTimeAdvanced(
      "audio-recording",
      async () => {
        const command = `
        export PATH="/opt/homebrew/bin:$PATH";
        "${SOX_PATH}" -d ${audioParams.soxArgs} "${outputPath}" silence 1 0.1 0% 1 ${audioParams.timeout} ${audioParams.threshold}
      `;

        await execAsync(command, { shell: "/bin/zsh" });

        // Mesure la taille du fichier audio
        const stats = fs.statSync(outputPath);
        return stats.size;
      },
      {
        silenceTimeout: parseFloat(silenceTimeout),
        mode: "recording",
      },
    );

    console.log("✅ Recording completed");

    // Restore original audio state if needed
    if (muteDuringDictation) {
      await setSystemAudioMute(originalMuteState);
    }

    // Process audio
    await showHUD("🔄 Converting speech to text...");
    startPeriodicNotification("🔄 Converting speech to text");

    let transcription: Transcription;

    if (whisperMode === "local") {
      const currentModelId = localEngine === "whisper" ? whisperModel : parakeetModel;

      transcription = await measureTimeAdvanced(
        `local-${localEngine}-transcription`,
        async () => {
          const text = await transcribeAudio(outputPath, localEngine, currentModelId, undefined);
          return { text };
        },
        {
          mode: whisperMode,
          engine: localEngine,
          model: currentModelId,
          audioLength: audioLength,
          platform: process.platform,
          arch: process.arch,
        },
      );
    } else if (whisperMode === "transcribe") {
      transcription = await measureTimeAdvanced(
        "cloud-transcription",
        async () => {
          return await openai.audio.transcriptions.create({
            file: fs.createReadStream(outputPath),
            model: transcribeModel,
          });
        },
        {
          mode: whisperMode,
          model: transcribeModel,
          audioLength: audioLength,
          provider: "openai",
        },
      );
    } else {
      throw new Error("Invalid whisper mode configuration. Please check your settings.");
    }

    stopPeriodicNotification();

    // For prompt mode, we don't fix text since it's already AI-generated content
    const prompt = transcription.text;

    // Add to history
    await addTranscriptionToHistory(prompt, "prompt", outputPath, {
      mode: whisperMode === "transcribe" ? "transcribe" : whisperMode === "local" ? "local" : "online",
      model:
        whisperMode === "transcribe"
          ? transcribeModel
          : whisperMode === "local"
            ? localEngine === "whisper"
              ? whisperModel
              : parakeetModel
            : undefined,
      textCorrectionEnabled: false, // No text correction for prompt mode
      targetLanguage: "prompt",
      activeApp: await getActiveApplication(),
    });

    // Execute the prompt
    await showHUD("🤖 Processing your request...");
    startPeriodicNotification("🤖 Processing your request");

    const generatedText = await measureTimeAdvanced(
      "llm-prompt-execution",
      async () => {
        return await executePrompt(prompt, selectedText, openai, usePersonalDictionary);
      },
      {
        promptLength: prompt.length,
        hasSelectedText: !!selectedText,
        selectedTextLength: selectedText?.length || 0,
        usePersonalDictionary,
        llmModel: getLLMModel(),
      },
    );

    stopPeriodicNotification();

    // Replace selected text or paste at cursor position
    if (selectedText) {
      await replaceSelectedText(generatedText);
      await showHUD("✅ Text replaced!");
    } else {
      const cleanedText = cleanOutputText(generatedText);
      await Clipboard.paste(cleanedText);
      await showHUD("✅ Text generated and pasted!");
    }

    console.log("✨ Operation completed successfully");

    // Termine la session de profiling
    await performanceProfiler.endSession();
  } catch (error) {
    console.error("❌ Error:", error);
    await showHUD("❌ Error: " + (error instanceof Error ? error.message : "An error occurred"));
    stopPeriodicNotification();

    // Restore original audio state in case of error
    if (muteDuringDictation) {
      await setSystemAudioMute(originalMuteState);
    }

    // Termine la session même en cas d'erreur
    await performanceProfiler.endSession();
  } finally {
    // Final cleanup
    try {
      await execAsync("pkill sox");
    } catch (error) {
      // Ignore pkill errors
    }
  }
}
