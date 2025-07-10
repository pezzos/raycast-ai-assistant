"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizedStartup = optimizedStartup;
exports.validateStartupResults = validateStartupResults;
exports.extractStartupComponents = extractStartupComponents;
const audio_1 = require("./audio");
const local_models_1 = require("./local-models");
const openai_client_1 = __importDefault(require("./openai-client"));
/**
 * Runs all startup checks in parallel for faster dictation initialization
 *
 * @param whisperMode - 'local' or 'cloud' mode for transcription
 * @param localEngine - Local engine type (if using local mode)
 * @param currentModelId - Current model ID (if using local mode)
 * @returns Combined results with individual error handling
 */
async function optimizedStartup(whisperMode, localEngine, currentModelId) {
    // Run all checks in parallel using Promise.allSettled for independent error handling
    const [audioResult, modelResult, openaiResult] = await Promise.allSettled([
        // Audio setup check (cached for performance)
        (0, audio_1.testAudioSetupCached)(),
        // Model availability check (only for local mode)
        whisperMode === "local" ? (0, local_models_1.isLocalTranscriptionAvailable)(localEngine, currentModelId) : Promise.resolve(true),
        // OpenAI client initialization
        openai_client_1.default.getClient(),
    ]);
    // Process audio setup result
    const audioSetup = audioResult.status === "fulfilled"
        ? { success: true, data: audioResult.value }
        : { success: false, error: audioResult.reason?.message || "Audio setup failed" };
    // Process model availability result
    const modelAvailable = modelResult.status === "fulfilled"
        ? { success: true, data: modelResult.value }
        : { success: false, error: modelResult.reason?.message || "Model availability check failed" };
    // Process OpenAI client result
    const openaiClient = openaiResult.status === "fulfilled"
        ? { success: true, data: openaiResult.value }
        : { success: false, error: openaiResult.reason?.message || "OpenAI client initialization failed" };
    return {
        audioSetup,
        modelAvailable,
        openaiClient,
    };
}
/**
 * Helper function to validate startup results and throw errors if critical checks failed
 * Maintains existing error handling patterns from the codebase
 *
 * @param results - Results from optimizedStartup()
 * @param whisperMode - Current whisper mode to determine required checks
 */
function validateStartupResults(results, whisperMode) {
    // Audio setup is always required
    if (!results.audioSetup.success) {
        throw new Error(results.audioSetup.error || "Audio setup validation failed");
    }
    // Model availability is required for local mode
    if (whisperMode === "local" && !results.modelAvailable.success) {
        throw new Error(results.modelAvailable.error || "Local model validation failed");
    }
    // OpenAI client is required for cloud mode (and some local mode features)
    if (!results.openaiClient.success) {
        throw new Error(results.openaiClient.error || "OpenAI client initialization failed");
    }
}
/**
 * Extract successfully initialized components from startup results
 *
 * @param results - Results from optimizedStartup()
 * @returns Object with successfully initialized components
 */
function extractStartupComponents(results) {
    return {
        audioSetup: results.audioSetup.success ? results.audioSetup.data : undefined,
        modelAvailable: results.modelAvailable.success ? results.modelAvailable.data : undefined,
        openaiClient: results.openaiClient.success ? results.openaiClient.data : undefined,
    };
}
