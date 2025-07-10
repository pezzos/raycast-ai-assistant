import { testAudioSetupCached } from "./audio";
import { isLocalTranscriptionAvailable } from "./local-models";
import OpenAIClientManager from "./openai-client";
import OpenAI from "openai";

/**
 * Result structure for individual startup checks
 */
export interface StartupCheckResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Combined results from all startup checks
 */
export interface OptimizedStartupResult {
  audioSetup: StartupCheckResult;
  modelAvailable: StartupCheckResult;
  openaiClient: StartupCheckResult;
}

/**
 * Runs all startup checks in parallel for faster dictation initialization
 *
 * @param whisperMode - 'local' or 'cloud' mode for transcription
 * @param localEngine - Local engine type (if using local mode)
 * @param currentModelId - Current model ID (if using local mode)
 * @returns Combined results with individual error handling
 */
export async function optimizedStartup(
  whisperMode: string,
  localEngine: string,
  currentModelId: string,
): Promise<OptimizedStartupResult> {
  // Run all checks in parallel using Promise.allSettled for independent error handling
  const [audioResult, modelResult, openaiResult] = await Promise.allSettled([
    // Audio setup check (cached for performance)
    testAudioSetupCached(),

    // Model availability check (only for local mode)
    whisperMode === "local" ? isLocalTranscriptionAvailable(localEngine, currentModelId) : Promise.resolve(true),

    // OpenAI client initialization
    OpenAIClientManager.getClient(),
  ]);

  // Process audio setup result
  const audioSetup: StartupCheckResult =
    audioResult.status === "fulfilled"
      ? { success: true, data: audioResult.value }
      : { success: false, error: audioResult.reason?.message || "Audio setup failed" };

  // Process model availability result
  const modelAvailable: StartupCheckResult =
    modelResult.status === "fulfilled"
      ? { success: true, data: modelResult.value }
      : { success: false, error: modelResult.reason?.message || "Model availability check failed" };

  // Process OpenAI client result
  const openaiClient: StartupCheckResult =
    openaiResult.status === "fulfilled"
      ? { success: true, data: openaiResult.value as OpenAI }
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
export function validateStartupResults(results: OptimizedStartupResult, whisperMode: string): void {
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
export function extractStartupComponents(results: OptimizedStartupResult): {
  audioSetup?: unknown;
  modelAvailable?: boolean;
  openaiClient?: OpenAI;
} {
  return {
    audioSetup: results.audioSetup.success ? results.audioSetup.data : undefined,
    modelAvailable: results.modelAvailable.success ? results.modelAvailable.data : undefined,
    openaiClient: results.openaiClient.success ? results.openaiClient.data : undefined,
  };
}
