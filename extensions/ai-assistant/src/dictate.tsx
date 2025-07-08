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
  USE_PERSONAL_DICTIONARY_KEY,
  MUTE_DURING_DICTATION_KEY,
  FIX_TEXT_KEY,
  EXPERIMENTAL_MODE_KEY,
} from "./settings";
import { cleanOutputText, enhancedTextProcessing } from "./utils/common";
import { smartTranscription } from "./utils/unified-transcription-v2";
import { recordPerformanceSnapshot } from "./utils/performance-comparator";
import { isLocalTranscriptionAvailable, transcribeAudio, type ModelEngine } from "./utils/local-models";
import { getPersonalDictionaryPrompt } from "./utils/dictionary";
import { LocalStorage } from "@raycast/api";

// Helper function to get dictionary entries
async function getPersonalDictionaryEntries() {
  const { DICTIONARY_ENTRIES_KEY } = await import("./dictate-dictionary");
  const savedEntries = await LocalStorage.getItem<string>(DICTIONARY_ENTRIES_KEY);
  return savedEntries ? JSON.parse(savedEntries) : [];
}
import { setSystemAudioMute, isSystemAudioMuted, getOptimizedAudioParams, testAudioSetup } from "./utils/audio";
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
    // Phase 1: Early audio setup test (non-intrusive)
    const audioSetup = await testAudioSetup();
    if (!audioSetup.soxAvailable || !audioSetup.inputDeviceAvailable) {
      await showHUD(`❌ Audio Error: ${audioSetup.error}`);
      return;
    }

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

    // Silence timeout is now handled by optimized silence parameters
    // const savedSilenceTimeout = await LocalStorage.getItem<string>(SILENCE_TIMEOUT_KEY);
    // const silenceTimeout = savedSilenceTimeout || "2.0";

    const savedUsePersonalDictionary = await LocalStorage.getItem<string>(USE_PERSONAL_DICTIONARY_KEY);
    const usePersonalDictionary = savedUsePersonalDictionary === "true";

    const savedMuteDuringDictation = await LocalStorage.getItem<string>(MUTE_DURING_DICTATION_KEY);
    muteDuringDictation = savedMuteDuringDictation === "true";
    
    const savedExperimentalMode = await LocalStorage.getItem<string>(EXPERIMENTAL_MODE_KEY);
    const experimentalMode = savedExperimentalMode === "true";

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
      experimentalMode,
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

    // Ensure recordings directory exists (lightweight check)
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }

    const outputPath = path.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);

    // Get optimized audio parameters (format + silence detection)
    const audioParams = await getOptimizedAudioParams();

    // Handle audio muting just before recording
    if (muteDuringDictation) {
      await setSystemAudioMute(true);
    }

    // Start recording with optimized parameters and direct format
    await showHUD(`🎙️ Recording... (will stop after ${audioParams.timeout}s of silence)`);

    const command = `
      export PATH="/opt/homebrew/bin:$PATH";
      "${SOX_PATH}" -d ${audioParams.soxArgs} "${outputPath}" silence 1 0.1 0% 1 ${audioParams.timeout} ${audioParams.threshold}
    `;

    await execAsync(command, { shell: "/bin/zsh" });
    console.log("✅ Recording completed");

    // Process audio
    await showHUD("🔄 Converting speech to text...");
    startPeriodicNotification("🔄 Converting speech to text");

    // Restore original audio state after starting conversion
    if (muteDuringDictation) {
      await setSystemAudioMute(originalMuteState);
    }

    let transcription: Transcription;
    let finalText: string;
    
    // Use unified transcription for online mode if experimental mode is enabled
    if (whisperMode === "transcribe" && experimentalMode) {
      // Get dictionary entries for unified transcription
      const dictionaryEntries = usePersonalDictionary ? await getPersonalDictionaryEntries() : [];
      
      const unifiedResult = await smartTranscription(openai, {
        audioFile: outputPath,
        model: transcribeModel,
        language: targetLanguage === "auto" ? undefined : targetLanguage,
        dictionaryEntries: dictionaryEntries,
        fixText: preferences.fixText,
        targetLanguage: targetLanguage !== "auto" ? targetLanguage : undefined,
      }, true); // Force experimental mode
      
      finalText = unifiedResult.text;
      transcription = { text: finalText };
      
      // Record performance snapshot for comparison
      await recordPerformanceSnapshot("optimized");
      
      console.log("✨ Unified transcription result:", {
        model: unifiedResult.metadata.model,
        processingTime: unifiedResult.metadata.processingTime,
        dictionaryApplied: unifiedResult.metadata.dictionaryApplied,
        textImproved: unifiedResult.metadata.textImproved,
        translated: unifiedResult.metadata.translated,
      });
    } else if (whisperMode === "local") {
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
      // Legacy transcription workflow
      transcription = await measureTime("gpt-4o Transcribe", async () => {
        return await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputPath),
          model: transcribeModel,
          language: targetLanguage === "auto" ? undefined : targetLanguage,
        });
      });
      
      stopPeriodicNotification();

      // Enhanced processing: combine dictionary corrections, text improvement, and potential translation
      finalText = transcription.text;

      // Gather all processing options
      const dictionaryPrompt = usePersonalDictionary ? await getPersonalDictionaryPrompt() : undefined;
      const needsProcessing = usePersonalDictionary || preferences.fixText || targetLanguage !== "auto";

      if (needsProcessing) {
        const processingTasks = [];
        if (dictionaryPrompt) processingTasks.push("dictionary corrections");
        if (preferences.fixText) processingTasks.push("text improvement");
        if (targetLanguage !== "auto") processingTasks.push(`translation to ${targetLanguage}`);

        await showHUD(`🔧 Processing: ${processingTasks.join(", ")}...`);
        startPeriodicNotification("Processing text");

        finalText = await measureTime("Enhanced text processing", async () => {
          return await enhancedTextProcessing(finalText, openai, {
            dictionaryPrompt,
            fixText: preferences.fixText,
            targetLanguage: targetLanguage !== "auto" ? targetLanguage : undefined,
          });
        });

        stopPeriodicNotification();
      }
      
      // Record performance snapshot for comparison
      await recordPerformanceSnapshot("legacy");
    } else {
      throw new Error("Invalid whisper mode configuration. Please check your settings.");
    }
    
    if (whisperMode === "local") {
      stopPeriodicNotification();
      finalText = transcription.text;
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

    // Translation is now handled in the enhanced processing above or unified transcription

    const cleanedFinalText = cleanOutputText(finalText);
    await Clipboard.paste(cleanedFinalText);
    await showHUD("✅ Transcription completed and pasted!");
    console.log("✨ Final result:", finalText);

    // Background cleanup (non-blocking)
    setImmediate(async () => {
      try {
        const recordingsToKeep = await getRecordingsToKeep();
        await cleanupOldRecordings(RECORDINGS_DIR, recordingsToKeep);
      } catch (error) {
        console.error("Background cleanup failed:", error);
      }
    });
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
