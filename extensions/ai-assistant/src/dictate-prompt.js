"use strict";
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
const common_1 = require("./utils/common");
const settings_1 = require("./settings");
const audio_1 = require("./utils/audio");
const startup_optimizer_1 = require("./utils/startup-optimizer");
const timing_1 = require("./utils/timing");
const timing_2 = require("./utils/timing");
const transcription_history_1 = require("./utils/transcription-history");
const active_app_1 = require("./utils/active-app");
const dictionary_1 = require("./utils/dictionary");
const local_models_1 = require("./utils/local-models");
const performance_profiler_1 = require("./utils/performance-profiler");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const SOX_PATH = "/opt/homebrew/bin/sox";
const RECORDINGS_DIR = path_1.default.join(__dirname, "recordings");
/**
 * Clean up old recording files (older than 1 hour)
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
/**
 * Execute the prompt using OpenAI
 * @param prompt The prompt to execute
 * @param selectedText Optional selected text to include in the prompt
 * @param openai OpenAI instance
 * @param usePersonalDictionary Whether to use the personal dictionary
 * @returns Promise<string> The generated text
 */
async function executePrompt(prompt, selectedText, openai, usePersonalDictionary) {
    console.log("Executing prompt with:", { prompt, hasSelectedText: !!selectedText });
    const dictionaryPrompt = usePersonalDictionary ? await (0, dictionary_1.getPersonalDictionaryPrompt)() : "";
    const systemPrompt = selectedText
        ? "You are an AI assistant that helps users modify text based on voice commands. Apply the user's prompt to modify the text. Respond ONLY with the modified text, without any explanations or context."
        : "You are an AI assistant that helps users generate text based on voice commands. Respond ONLY with the generated text, without any explanations or context.";
    const userPrompt = selectedText
        ? `Please modify the following text according to this instruction: "${prompt}"${dictionaryPrompt ? "\n\nPlease also apply these dictionary rules:\n" + dictionaryPrompt : ""}\n\nText to modify: "${selectedText}"`
        : `${prompt}${dictionaryPrompt ? "\n\nPlease apply these dictionary rules:\n" + dictionaryPrompt : ""}`;
    console.log("Sending to OpenAI:", {
        model: (0, common_1.getLLMModel)(),
        systemPrompt,
        userPrompt,
    });
    const completion = await openai.chat.completions.create({
        model: (0, common_1.getLLMModel)(),
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
async function Command() {
    console.log("🎙️ Starting dictate-prompt command...");
    // Démarre le profiling de session
    await performance_profiler_1.performanceProfiler.startSession("dictate-prompt");
    let originalMuteState = false;
    let muteDuringDictation = false;
    try {
        // Phase 1: Audio setup will be handled by optimizedStartup() in parallel
        // Load settings from local storage
        const savedWhisperMode = await api_1.LocalStorage.getItem(settings_1.WHISPER_MODE_KEY);
        const whisperMode = savedWhisperMode || "transcribe";
        const savedTranscribeModel = await api_1.LocalStorage.getItem(settings_1.TRANSCRIBE_MODEL_KEY);
        const transcribeModel = savedTranscribeModel || "gpt-4o-mini-transcribe";
        const savedLocalEngine = await api_1.LocalStorage.getItem(settings_1.LOCAL_ENGINE_KEY);
        const localEngine = savedLocalEngine || "whisper";
        const savedWhisperModel = await api_1.LocalStorage.getItem(settings_1.WHISPER_MODEL_KEY);
        const whisperModel = savedWhisperModel || "base";
        const savedParakeetModel = await api_1.LocalStorage.getItem(settings_1.PARAKEET_MODEL_KEY);
        const parakeetModel = savedParakeetModel || "parakeet-tdt-0.6b-v2";
        const savedUsePersonalDictionary = await api_1.LocalStorage.getItem(settings_1.USE_PERSONAL_DICTIONARY_KEY);
        const usePersonalDictionary = savedUsePersonalDictionary === "true";
        const savedMuteDuringDictation = await api_1.LocalStorage.getItem(settings_1.MUTE_DURING_DICTATION_KEY);
        muteDuringDictation = savedMuteDuringDictation === "true";
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
        // Get selected text if any
        let selectedText = null;
        try {
            selectedText = await (0, common_1.getSelectedText)();
            if (selectedText) {
                console.log("Found selected text:", selectedText);
            }
            else {
                console.log("No text currently selected");
            }
        }
        catch (error) {
            // This is a normal case when there's just a cursor position without selection
            console.log("No text selected, will generate new text");
        }
        // Ensure recordings directory exists (lightweight check)
        if (!fs_1.default.existsSync(RECORDINGS_DIR)) {
            fs_1.default.mkdirSync(RECORDINGS_DIR, { recursive: true });
        }
        const outputPath = path_1.default.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);
        console.log("Recording will be saved to:", outputPath);
        // Get optimized audio parameters
        const audioParams = await (0, audio_1.getOptimizedAudioParams)();
        // Handle audio muting just before recording
        if (muteDuringDictation) {
            originalMuteState = await (0, audio_1.isSystemAudioMuted)();
            await (0, audio_1.setSystemAudioMute)(true);
        }
        await (0, api_1.showHUD)(`🎙️ Recording (stops after ${audioParams.timeout}s of silence)`);
        console.log("Starting recording...");
        const audioLength = await (0, timing_1.measureTimeAdvanced)("audio-recording", async () => {
            const command = `
        export PATH="/opt/homebrew/bin:$PATH";
        "${SOX_PATH}" -d ${audioParams.soxArgs} "${outputPath}" silence 1 0.1 0% 1 ${audioParams.timeout} ${audioParams.threshold}
      `;
            await execAsync(command, { shell: "/bin/zsh" });
            // Mesure la taille du fichier audio
            const stats = fs_1.default.statSync(outputPath);
            return stats.size;
        }, {
            silenceTimeout: audioParams.timeout,
            mode: "recording",
        });
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
        if (whisperMode === "local") {
            const currentModelId = localEngine === "whisper" ? whisperModel : parakeetModel;
            await (0, api_1.showHUD)("🔄 Transcribing locally...");
            (0, timing_2.startPeriodicNotification)("🔄 Transcribing locally");
            transcription = await (0, timing_1.measureTimeAdvanced)(`local-${localEngine}-transcription`, async () => {
                const text = await (0, local_models_1.transcribeAudio)(outputPath, localEngine, currentModelId, undefined);
                return { text };
            }, {
                mode: whisperMode,
                engine: localEngine,
                model: currentModelId,
                audioLength: audioLength,
                platform: process.platform,
                arch: process.arch,
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
            transcription = await (0, timing_1.measureTimeAdvanced)("cloud-transcription", async () => {
                return await openai.audio.transcriptions.create({
                    file: fs_1.default.createReadStream(outputPath),
                    model: transcribeModel,
                });
            }, {
                mode: whisperMode,
                model: transcribeModel,
                audioLength: audioLength,
                provider: "openai",
            });
            // Check if output indicates no audio was detected
            if (transcription.text.trim().startsWith('Personal Dictionary: "')) {
                console.log("⚠️ No audio detected - output starts with Personal Dictionary");
                await (0, api_1.showHUD)("🔇 No audio detected");
                return;
            }
        }
        else {
            throw new Error("Invalid whisper mode configuration. Please check your settings.");
        }
        (0, timing_2.stopPeriodicNotification)();
        // For prompt mode, we don't fix text since it's already AI-generated content
        const prompt = transcription.text;
        // Add to history
        await (0, transcription_history_1.addTranscriptionToHistory)(prompt, "prompt", outputPath, {
            mode: whisperMode === "transcribe" ? "transcribe" : whisperMode === "local" ? "local" : "online",
            model: whisperMode === "transcribe"
                ? transcribeModel
                : whisperMode === "local"
                    ? localEngine === "whisper"
                        ? whisperModel
                        : parakeetModel
                    : undefined,
            textCorrectionEnabled: false, // No text correction for prompt mode
            targetLanguage: "prompt",
            activeApp: await (0, active_app_1.getActiveApplication)(),
        });
        // Execute the prompt
        await (0, api_1.showHUD)("🤖 Processing request...");
        (0, timing_2.startPeriodicNotification)("🤖 Processing your request");
        const generatedText = await (0, timing_1.measureTimeAdvanced)("llm-prompt-execution", async () => {
            return await executePrompt(prompt, selectedText, openai, usePersonalDictionary);
        }, {
            promptLength: prompt.length,
            hasSelectedText: !!selectedText,
            selectedTextLength: selectedText?.length || 0,
            usePersonalDictionary,
            llmModel: (0, common_1.getLLMModel)(),
        });
        (0, timing_2.stopPeriodicNotification)();
        // Replace selected text or paste at cursor position
        if (selectedText) {
            await (0, common_1.replaceSelectedText)(generatedText);
            await (0, api_1.showHUD)("✅ Text replaced");
        }
        else {
            const cleanedText = (0, common_1.cleanOutputText)(generatedText);
            await api_1.Clipboard.paste(cleanedText);
            await (0, api_1.showHUD)("✅ Text pasted");
        }
        console.log("✨ Operation completed successfully");
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
        // Termine la session de profiling
        await performance_profiler_1.performanceProfiler.endSession();
    }
    catch (error) {
        console.error("❌ Error:", error);
        await (0, api_1.showHUD)("❌ Dictation failed");
        (0, timing_2.stopPeriodicNotification)();
        // Restore original audio state in case of error
        if (muteDuringDictation) {
            await (0, audio_1.setSystemAudioMute)(originalMuteState);
        }
        // Termine la session même en cas d'erreur
        await performance_profiler_1.performanceProfiler.endSession();
    }
    finally {
        // Final cleanup
        try {
            await execAsync("pkill sox");
        }
        catch (error) {
            // Ignore pkill errors
        }
    }
}
