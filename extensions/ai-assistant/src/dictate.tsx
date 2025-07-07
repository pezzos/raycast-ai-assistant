import { showHUD, getPreferenceValues, LocalStorage, Clipboard } from "@raycast/api";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import {
  DICTATE_TARGET_LANG_KEY,
  WHISPER_MODE_KEY,
  WHISPER_MODEL_KEY,
  PARAKEET_MODEL_KEY,
  LOCAL_ENGINE_KEY,
  TRANSCRIBE_MODEL_KEY,
  SILENCE_TIMEOUT_KEY,
  USE_PERSONAL_DICTIONARY_KEY,
  MUTE_DURING_DICTATION_KEY,
  FIX_TEXT_KEY,
} from "./settings";
import { cleanText, getLLMModel } from "./utils/common";
import { isLocalTranscriptionAvailable, transcribeAudio, type ModelEngine } from "./utils/local-models";
import { getPersonalDictionaryPrompt } from "./utils/dictionary";
import { setSystemAudioMute, isSystemAudioMuted } from "./utils/audio";
import { measureTime } from "./utils/timing";
import { startPeriodicNotification, stopPeriodicNotification } from "./utils/timing";
import { addTranscriptionToHistory, getRecordingsToKeep } from "./utils/transcription-history";
import { getActiveApplication } from "./utils/active-app";
import OpenAIClientManager from "./utils/openai-client";
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
 * Clean up old recording files that are not in history and older than 1 hour
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

export default async function Command() {
  console.log("🎙️ Starting dictation...");

  // Démarre le profiling de session
  await performanceProfiler.startSession("dictate");

  let originalMuteState = false;
  let muteDuringDictation = false;

  try {
    // Load settings and check parallel conditions
    const [preferences, audioMuteState] = await Promise.all([getPreferenceValues<Preferences>(), isSystemAudioMuted()]);

    // Apply settings
    const savedFixText = await LocalStorage.getItem<string>(FIX_TEXT_KEY);
    preferences.fixText = savedFixText === "true";

    const savedTargetLang = await LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY);
    const targetLanguage = savedTargetLang || "auto";

    const savedWhisperMode = await LocalStorage.getItem<string>(WHISPER_MODE_KEY);
    const whisperMode = savedWhisperMode || "transcribe";

    const savedLocalEngine = await LocalStorage.getItem<string>(LOCAL_ENGINE_KEY);
    const localEngine = (savedLocalEngine as ModelEngine) || "whisper";

    const savedWhisperModel = await LocalStorage.getItem<string>(WHISPER_MODEL_KEY);
    const whisperModel = savedWhisperModel || "base";

    const savedParakeetModel = await LocalStorage.getItem<string>(PARAKEET_MODEL_KEY);
    const parakeetModel = savedParakeetModel || "parakeet-tdt-0.6b-v2";

    const savedTranscribeModel = await LocalStorage.getItem<string>(TRANSCRIBE_MODEL_KEY);
    const transcribeModel = savedTranscribeModel || "gpt-4o-mini-transcribe";

    const savedSilenceTimeout = await LocalStorage.getItem<string>(SILENCE_TIMEOUT_KEY);
    const silenceTimeout = savedSilenceTimeout || "2.0";

    const savedUsePersonalDictionary = await LocalStorage.getItem<string>(USE_PERSONAL_DICTIONARY_KEY);
    const usePersonalDictionary = savedUsePersonalDictionary === "true";

    const savedMuteDuringDictation = await LocalStorage.getItem<string>(MUTE_DURING_DICTATION_KEY);
    muteDuringDictation = savedMuteDuringDictation === "true";

    originalMuteState = audioMuteState;

    const currentModel =
      whisperMode === "local"
        ? localEngine === "whisper"
          ? whisperModel
          : parakeetModel
        : whisperMode === "transcribe"
          ? transcribeModel
          : "whisper-1";

    console.log("⚙️ Configuration:", {
      mode: whisperMode,
      engine: whisperMode === "local" ? localEngine : "cloud",
      model: currentModel,
      targetLanguage,
      fixText: preferences.fixText,
      usePersonalDictionary,
    });

    // Parallel setup operations
    const [, openai] = await Promise.all([
      // Check if local model is available if needed
      whisperMode === "local"
        ? (async () => {
            const currentModelId = localEngine === "whisper" ? whisperModel : parakeetModel;
            const isAvailable = await isLocalTranscriptionAvailable(localEngine, currentModelId);

            if (!isAvailable) {
              const engineName = localEngine === "whisper" ? "Whisper" : "Parakeet";
              throw new Error(
                `${engineName} engine or model ${currentModelId} is not available - Please install from the Local Models menu`,
              );
            }
          })()
        : Promise.resolve(),

      // Setup OpenAI client
      OpenAIClientManager.getClient(),
    ]);

    // Prepare directory and cleanup
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }
    const recordingsToKeep = await getRecordingsToKeep();
    await cleanupOldRecordings(RECORDINGS_DIR, recordingsToKeep);

    const outputPath = path.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);

    // Handle audio muting if enabled (originalMuteState already set from parallel call)
    if (muteDuringDictation) {
      await setSystemAudioMute(true);
    }

    // Start recording
    await showHUD(`🎙️ Recording... (will stop after ${silenceTimeout}s of silence)`);

    const command = `
      export PATH="/opt/homebrew/bin:$PATH";
      "${SOX_PATH}" -d "${outputPath}" silence 1 0.1 0% 1 ${silenceTimeout} 2%
    `;

    await execAsync(command, { shell: "/bin/zsh" });
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
      const engineDisplayName = localEngine === "whisper" ? "Whisper" : "Parakeet";
      const currentModelId = localEngine === "whisper" ? whisperModel : parakeetModel;

      transcription = await measureTime(`Local ${engineDisplayName} transcription`, async () => {
        const text = await transcribeAudio(
          outputPath,
          localEngine,
          currentModelId,
          targetLanguage === "auto" ? undefined : targetLanguage,
        );
        return { text };
      });
    } else if (whisperMode === "transcribe") {
      transcription = await measureTime("gpt-4o Transcribe", async () => {
        return await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputPath),
          model: transcribeModel,
          language: targetLanguage === "auto" ? undefined : targetLanguage,
        });
      });
    } else {
      throw new Error("Invalid whisper mode configuration. Please check your settings.");
    }

    // Apply personal dictionary corrections if enabled, regardless of transcription mode
    if (usePersonalDictionary) {
      transcription = await measureTime("Personal dictionary corrections", async () => {
        const dictionaryPrompt = await getPersonalDictionaryPrompt();
        if (dictionaryPrompt) {
          const completion = await openai.chat.completions.create({
            model: getLLMModel(),
            messages: [
              {
                role: "system",
                content:
                  "You are a text correction assistant. Your task is to apply personal dictionary corrections to the transcribed text while preserving the original meaning and formatting.",
              },
              {
                role: "user",
                content: `Please correct this transcribed text according to the personal dictionary:\n\n${dictionaryPrompt}\n\nText to correct:\n"${transcription.text}"\n\nRespond ONLY with the corrected text.`,
              },
            ],
            temperature: 0.3,
          });

          return { text: completion.choices[0].message.content?.trim() || transcription.text };
        }
        return transcription;
      });
    }

    stopPeriodicNotification();

    // Clean up the transcription if needed
    let finalText = transcription.text;
    if (preferences.fixText) {
      await showHUD("✍️ Improving text...");
      startPeriodicNotification("✍️ Improving text");
      finalText = await measureTime("Text improvement", async () => {
        return await cleanText(finalText, openai);
      });
      stopPeriodicNotification();
    }

    // Add to history
    await addTranscriptionToHistory(finalText, targetLanguage, outputPath, {
      mode: whisperMode === "local" ? "local" : whisperMode === "transcribe" ? "transcribe" : "online",
      model:
        whisperMode === "local"
          ? `${localEngine}-${localEngine === "whisper" ? whisperModel : parakeetModel}`
          : whisperMode === "transcribe"
            ? transcribeModel
            : undefined,
      engine: whisperMode === "local" ? localEngine : undefined,
      textCorrectionEnabled: preferences.fixText,
      targetLanguage,
      activeApp: await getActiveApplication(),
    });

    // Translate if needed
    if (targetLanguage !== "auto") {
      await showHUD(`🌐 Translating to ${targetLanguage}...`);
      startPeriodicNotification(`Translating to ${targetLanguage}`);

      finalText = await measureTime("Translation", async () => {
        const completion = await openai.chat.completions.create({
          model: getLLMModel(),
          messages: [
            {
              role: "system",
              content: `You are a translator. Translate the following text to the specified language: ${targetLanguage}. Keep the tone and style of the original text.`,
            },
            {
              role: "user",
              content: finalText,
            },
          ],
          temperature: 0.3,
        });

        return completion.choices[0].message.content || finalText;
      });

      stopPeriodicNotification();
    }

    await Clipboard.paste(finalText);
    await showHUD("✅ Transcription completed and pasted!");
    console.log("✨ Final result:", finalText);
  } catch (error) {
    console.error("❌ Error during dictation:", error);
    await showHUD("❌ Error during dictation");
    stopPeriodicNotification();

    // Restore original audio state in case of error
    if (muteDuringDictation) {
      await setSystemAudioMute(originalMuteState);
    }
  }
}
