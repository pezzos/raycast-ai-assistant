"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const api_1 = require("@raycast/api");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const settings_1 = require("./settings");
const common_1 = require("./utils/common");
const unified_transcription_v2_1 = require("./utils/unified-transcription-v2");
const performance_comparator_1 = require("./utils/performance-comparator");
const local_models_1 = require("./utils/local-models");
const dictionary_1 = require("./utils/dictionary");
// Helper function to get dictionary entries
async function getPersonalDictionaryEntries() {
    const { DICTIONARY_ENTRIES_KEY } = await Promise.resolve().then(() => __importStar(require("./dictate-dictionary")));
    const savedEntries = await api_1.LocalStorage.getItem(DICTIONARY_ENTRIES_KEY);
    return savedEntries ? JSON.parse(savedEntries) : [];
}
const audio_1 = require("./utils/audio");
const startup_optimizer_1 = require("./utils/startup-optimizer");
const timing_1 = require("./utils/timing");
const timing_2 = require("./utils/timing");
const transcription_history_1 = require("./utils/transcription-history");
const active_app_1 = require("./utils/active-app");
const performance_profiler_1 = require("./utils/performance-profiler");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const SOX_PATH = "/opt/homebrew/bin/sox";
const RECORDINGS_DIR = path_1.default.join(__dirname, "recordings");
/**
 * Clean up old recording files that are not in history and older than 1 hour
 * @param tempDir Directory containing the recordings
 * @param recordingsToKeep Set of recording paths to keep
 */
async function cleanupOldRecordings(tempDir, recordingsToKeep) {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    try {
        const files = fs_1.default.readdirSync(tempDir);
        for (const file of files) {
            const filePath = path_1.default.join(tempDir, file);
            const stats = fs_1.default.statSync(filePath);
            if (stats.mtimeMs < oneHourAgo &&
                file.startsWith("recording-") &&
                file.endsWith(".wav") &&
                !recordingsToKeep.has(filePath)) {
                fs_1.default.unlinkSync(filePath);
                console.log(`Cleaned up old recording: ${file}`);
            }
        }
    }
    catch (error) {
        console.error("Error cleaning up old recordings:", error);
    }
}
async function Command() {
    console.log("🎙️ Starting dictation...");
    // Démarre le profiling de session
    await performance_profiler_1.performanceProfiler.startSession("dictate");
    let originalMuteState = false;
    let muteDuringDictation = false;
    try {
        // Phase 1: Audio setup will be handled by optimizedStartup() in parallel
        // Load settings and check parallel conditions
        const [preferences, audioMuteState] = await Promise.all([(0, api_1.getPreferenceValues)(), (0, audio_1.isSystemAudioMuted)()]);
        // Apply settings
        const savedFixText = await api_1.LocalStorage.getItem(settings_1.FIX_TEXT_KEY);
        preferences.fixText = savedFixText === "true";
        const savedTargetLang = await api_1.LocalStorage.getItem(settings_1.DICTATE_TARGET_LANG_KEY);
        const targetLanguage = savedTargetLang || "auto";
        const savedWhisperMode = await api_1.LocalStorage.getItem(settings_1.WHISPER_MODE_KEY);
        const whisperMode = savedWhisperMode || "transcribe";
        const savedLocalEngine = await api_1.LocalStorage.getItem(settings_1.LOCAL_ENGINE_KEY);
        const localEngine = savedLocalEngine || "whisper";
        const savedWhisperModel = await api_1.LocalStorage.getItem(settings_1.WHISPER_MODEL_KEY);
        const whisperModel = savedWhisperModel || "base";
        const savedParakeetModel = await api_1.LocalStorage.getItem(settings_1.PARAKEET_MODEL_KEY);
        const parakeetModel = savedParakeetModel || "parakeet-tdt-0.6b-v2";
        const savedTranscribeModel = await api_1.LocalStorage.getItem(settings_1.TRANSCRIBE_MODEL_KEY);
        const transcribeModel = savedTranscribeModel || "gpt-4o-mini-transcribe";
        const savedUsePersonalDictionary = await api_1.LocalStorage.getItem(settings_1.USE_PERSONAL_DICTIONARY_KEY);
        const usePersonalDictionary = savedUsePersonalDictionary === "true";
        const savedMuteDuringDictation = await api_1.LocalStorage.getItem(settings_1.MUTE_DURING_DICTATION_KEY);
        muteDuringDictation = savedMuteDuringDictation === "true";
        const savedExperimentalMode = await api_1.LocalStorage.getItem(settings_1.EXPERIMENTAL_MODE_KEY);
        const experimentalMode = savedExperimentalMode === "true";
        originalMuteState = audioMuteState;
        const currentModel = whisperMode === "local"
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
        // Phase 2: Optimized parallel startup operations
        const currentModelId = localEngine === "whisper" ? whisperModel : parakeetModel;
        const startupResults = await (0, startup_optimizer_1.optimizedStartup)(whisperMode, localEngine, currentModelId);
        // Validate critical components (this will throw if audio or required models fail)
        (0, startup_optimizer_1.validateStartupResults)(startupResults, whisperMode);
        // Extract successfully initialized components
        const { openaiClient: openai } = (0, startup_optimizer_1.extractStartupComponents)(startupResults);
        // Ensure OpenAI client is available (should be guaranteed by validation above)
        if (!openai) {
            await (0, api_1.showHUD)("❌ OpenAI client initialization failed");
            return;
        }
        // Ensure recordings directory exists (lightweight check)
        if (!fs_1.default.existsSync(RECORDINGS_DIR)) {
            fs_1.default.mkdirSync(RECORDINGS_DIR, { recursive: true });
        }
        const outputPath = path_1.default.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);
        // Get optimized audio parameters (format + silence detection)
        const audioParams = await (0, audio_1.getOptimizedAudioParams)();
        // Handle audio muting just before recording
        if (muteDuringDictation) {
            await (0, audio_1.setSystemAudioMute)(true);
        }
        // Start recording with optimized parameters and direct format
        await (0, api_1.showHUD)(`🎙️ Recording (stops after ${audioParams.timeout}s of silence)`);
        const command = `
      export PATH="/opt/homebrew/bin:$PATH";
      "${SOX_PATH}" -d ${audioParams.soxArgs} "${outputPath}" silence 1 0.1 0% 1 ${audioParams.timeout} ${audioParams.threshold}
    `;
        await execAsync(command, { shell: "/bin/zsh" });
        console.log("✅ Recording completed");
        // Check for no audio detected conditions
        try {
            const audioFileStats = fs_1.default.statSync(outputPath);
            const fileSizeBytes = audioFileStats.size;
            // Check if file is too small (likely empty audio)
            if (fileSizeBytes < 3500) {
                console.log(`⚠️ Audio file too small: ${fileSizeBytes} bytes`);
                await (0, api_1.showHUD)("🔇 No audio detected");
                // Restore original audio state
                if (muteDuringDictation) {
                    await (0, audio_1.setSystemAudioMute)(originalMuteState);
                }
                return;
            }
        }
        catch (error) {
            console.error("Error checking audio file:", error);
        }
        // Process audio
        await (0, api_1.showHUD)("🔄 Converting to text...");
        (0, timing_2.startPeriodicNotification)("🔄 Converting speech to text");
        // Restore original audio state after starting conversion
        if (muteDuringDictation) {
            await (0, audio_1.setSystemAudioMute)(originalMuteState);
        }
        let transcription;
        let finalText = "";
        // Use unified transcription for online mode if experimental mode is enabled
        if (whisperMode === "transcribe" && experimentalMode) {
            // Get dictionary entries for unified transcription
            const dictionaryEntries = usePersonalDictionary ? await getPersonalDictionaryEntries() : [];
            const unifiedResult = await (0, unified_transcription_v2_1.smartTranscription)(openai, {
                audioFile: outputPath,
                model: transcribeModel,
                language: targetLanguage === "auto" ? undefined : targetLanguage,
                dictionaryEntries: dictionaryEntries,
                fixText: preferences.fixText,
                targetLanguage: targetLanguage !== "auto" ? targetLanguage : undefined,
            }, true); // Force experimental mode
            finalText = unifiedResult.text;
            transcription = { text: finalText };
            // Check if output indicates no audio was detected
            if (finalText.trim().startsWith('Personal Dictionary: "')) {
                console.log("⚠️ No audio detected - output starts with Personal Dictionary");
                await (0, api_1.showHUD)("🔇 No audio detected");
                return;
            }
            // Record performance snapshot for comparison
            await (0, performance_comparator_1.recordPerformanceSnapshot)("optimized");
            console.log("✨ Unified transcription result:", {
                model: unifiedResult.metadata.model,
                processingTime: unifiedResult.metadata.processingTime,
                dictionaryApplied: unifiedResult.metadata.dictionaryApplied,
                textImproved: unifiedResult.metadata.textImproved,
                translated: unifiedResult.metadata.translated,
            });
        }
        else if (whisperMode === "local") {
            const engineDisplayName = localEngine === "whisper" ? "Whisper" : "Parakeet";
            const currentModelId = localEngine === "whisper" ? whisperModel : parakeetModel;
            await (0, api_1.showHUD)("🔄 Transcribing locally...");
            (0, timing_2.startPeriodicNotification)("🔄 Transcribing locally");
            transcription = await (0, timing_1.measureTime)(`Local ${engineDisplayName} transcription`, async () => {
                const text = await (0, local_models_1.transcribeAudio)(outputPath, localEngine, currentModelId, targetLanguage === "auto" ? undefined : targetLanguage);
                return { text };
            });
            (0, timing_2.stopPeriodicNotification)();
            // Check if output indicates no audio was detected
            if (transcription.text.trim().startsWith('Personal Dictionary: "')) {
                console.log("⚠️ No audio detected - output starts with Personal Dictionary");
                await (0, api_1.showHUD)("🔇 No audio detected");
                return;
            }
        }
        else if (whisperMode === "transcribe") {
            // Legacy transcription workflow
            transcription = await (0, timing_1.measureTime)("gpt-4o Transcribe", async () => {
                return await openai.audio.transcriptions.create({
                    file: fs_1.default.createReadStream(outputPath),
                    model: transcribeModel,
                    language: targetLanguage === "auto" ? undefined : targetLanguage,
                });
            });
            (0, timing_2.stopPeriodicNotification)();
            // Check if output indicates no audio was detected
            if (transcription.text.trim().startsWith('Personal Dictionary: "')) {
                console.log("⚠️ No audio detected - output starts with Personal Dictionary");
                await (0, api_1.showHUD)("🔇 No audio detected");
                return;
            }
            // Enhanced processing: combine dictionary corrections, text improvement, and potential translation
            finalText = transcription.text;
            // Gather all processing options
            const dictionaryPrompt = usePersonalDictionary ? await (0, dictionary_1.getPersonalDictionaryPrompt)() : undefined;
            const needsProcessing = usePersonalDictionary || preferences.fixText || targetLanguage !== "auto";
            if (needsProcessing) {
                const processingTasks = [];
                if (dictionaryPrompt)
                    processingTasks.push("dictionary corrections");
                if (preferences.fixText)
                    processingTasks.push("text improvement");
                if (targetLanguage !== "auto")
                    processingTasks.push(`translation to ${targetLanguage}`);
                await (0, api_1.showHUD)("🔧 Processing text...");
                (0, timing_2.startPeriodicNotification)("Processing text");
                finalText = await (0, timing_1.measureTime)("Enhanced text processing", async () => {
                    return await (0, common_1.enhancedTextProcessing)(finalText, openai, {
                        dictionaryPrompt,
                        fixText: preferences.fixText,
                        targetLanguage: targetLanguage !== "auto" ? targetLanguage : undefined,
                    });
                });
                (0, timing_2.stopPeriodicNotification)();
            }
            // Record performance snapshot for comparison
            await (0, performance_comparator_1.recordPerformanceSnapshot)("legacy");
        }
        else {
            throw new Error("Invalid whisper mode configuration. Please check your settings.");
        }
        if (whisperMode === "local") {
            (0, timing_2.stopPeriodicNotification)();
            finalText = transcription.text;
        }
        // Translation is now handled in the enhanced processing above or unified transcription
        const cleanedFinalText = (0, common_1.cleanOutputText)(finalText);
        await api_1.Clipboard.paste(cleanedFinalText);
        await (0, api_1.showHUD)("✅ Text pasted");
        console.log("✨ Final result:", finalText);
        // Add to history in background (non-blocking)
        setImmediate(async () => {
            try {
                console.log("Adding transcription to history:", {
                    textLength: finalText.length,
                    language: targetLanguage,
                    recordingPath: outputPath,
                    details: {
                        mode: whisperMode === "local" ? "local" : whisperMode === "transcribe" ? "transcribe" : "online",
                        model: whisperMode === "local"
                            ? `${localEngine}-${localEngine === "whisper" ? whisperModel : parakeetModel}`
                            : whisperMode === "transcribe"
                                ? transcribeModel
                                : undefined,
                        textCorrectionEnabled: preferences.fixText,
                        targetLanguage,
                        activeApp: await (0, active_app_1.getActiveApplication)(),
                    },
                });
                await (0, transcription_history_1.addTranscriptionToHistory)(finalText, targetLanguage, outputPath, {
                    mode: whisperMode === "local" ? "local" : whisperMode === "transcribe" ? "transcribe" : "online",
                    model: whisperMode === "local"
                        ? `${localEngine}-${localEngine === "whisper" ? whisperModel : parakeetModel}`
                        : whisperMode === "transcribe"
                            ? transcribeModel
                            : undefined,
                    textCorrectionEnabled: preferences.fixText,
                    targetLanguage,
                    activeApp: await (0, active_app_1.getActiveApplication)(),
                });
            }
            catch (error) {
                console.error("Background history addition failed:", error);
                // Don't show error to user as this is non-critical
            }
        });
        // Background cleanup (non-blocking)
        setImmediate(async () => {
            try {
                const recordingsToKeep = await (0, transcription_history_1.getRecordingsToKeep)();
                await cleanupOldRecordings(RECORDINGS_DIR, recordingsToKeep);
            }
            catch (error) {
                console.error("Background cleanup failed:", error);
            }
        });
    }
    catch (error) {
        console.error("❌ Error during dictation:", error);
        await (0, api_1.showHUD)("❌ Dictation failed");
        (0, timing_2.stopPeriodicNotification)();
        // Restore original audio state in case of error
        if (muteDuringDictation) {
            await (0, audio_1.setSystemAudioMute)(originalMuteState);
        }
    }
}
