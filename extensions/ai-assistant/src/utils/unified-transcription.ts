import OpenAI from "openai";
import fs from "fs";
import { measureTime } from "./timing";
import { performanceProfiler } from "./performance-profiler";

interface DictionaryEntry {
  original: string;
  correction: string;
  addedAt: number;
}

interface UnifiedTranscriptionOptions {
  audioFile: string;
  model: string; // gpt-4o-mini-transcribe | gpt-4o-transcribe
  language?: string;
  dictionaryEntries?: DictionaryEntry[];
  fixText?: boolean;
  targetLanguage?: string;
}

interface UnifiedTranscriptionResult {
  text: string;
  metadata: {
    model: string;
    language?: string;
    dictionaryApplied: boolean;
    textImproved: boolean;
    translated: boolean;
    processingTime: number;
    tokenCount?: number;
  };
}

/**
 * Builds an intelligent prompt for transcription that integrates dictionary corrections,
 * text improvement, and translation in a single API call
 */
function buildUnifiedTranscriptionPrompt(options: {
  dictionaryEntries?: DictionaryEntry[];
  fixText?: boolean;
  targetLanguage?: string;
}): string {
  const { dictionaryEntries, fixText, targetLanguage } = options;
  
  // Base transcription instruction
  let prompt = "Transcribe this audio with maximum accuracy.";
  
  // Add personal dictionary corrections if provided
  if (dictionaryEntries && dictionaryEntries.length > 0) {
    prompt += "\n\nPersonal dictionary corrections to apply:";
    dictionaryEntries.forEach(entry => {
      prompt += `\n- When you hear "${entry.original}", transcribe as "${entry.correction}"`;
    });
    prompt += "\nOnly apply these corrections when you're confident the spoken word matches exactly.";
  }
  
  // Add text improvement instructions if enabled
  if (fixText) {
    prompt += "\n\nAfter transcription, improve the text by:";
    prompt += "\n- Correcting grammar and punctuation";
    prompt += "\n- Ensuring proper capitalization";
    prompt += "\n- Making the text more natural and fluent";
    prompt += "\n- Maintaining the original meaning and tone";
  }
  
  // Add translation instruction if target language is specified
  if (targetLanguage && targetLanguage !== "auto") {
    prompt += `\n\nAfter transcription${fixText ? " and improvement" : ""}, translate the result to ${targetLanguage}.`;
    prompt += "\nMaintain the tone, style, and meaning of the original text.";
  }
  
  // Final instruction
  prompt += "\n\nRespond ONLY with the final processed text.";
  
  return prompt;
}

/**
 * Performs unified transcription with integrated dictionary corrections, 
 * text improvement, and translation in a single API call
 */
export async function unifiedTranscription(
  openai: OpenAI,
  options: UnifiedTranscriptionOptions
): Promise<UnifiedTranscriptionResult> {
  const startTime = Date.now();
  
  // Build the unified prompt
  const prompt = buildUnifiedTranscriptionPrompt({
    dictionaryEntries: options.dictionaryEntries,
    fixText: options.fixText,
    targetLanguage: options.targetLanguage
  });
  
  // Perform transcription with unified prompt
  const transcriptionResult = await performanceProfiler.measureOperation(
    "unified-transcription",
    async () => {
      return await openai.audio.transcriptions.create({
        file: fs.createReadStream(options.audioFile),
        model: options.model,
        language: options.language,
        prompt: prompt,
        temperature: 0.1, // Low temperature for consistency
      });
    },
    {
      mode: "unified",
      model: options.model,
      language: options.language,
      dictionaryEntries: options.dictionaryEntries?.length || 0,
      fixText: options.fixText,
      targetLanguage: options.targetLanguage,
    }
  );
  
  const processingTime = Date.now() - startTime;
  
  // Debug logging
  console.log("\ud83d\udcdd Unified prompt used:", prompt);
  console.log("\u2728 Raw transcription result:", transcriptionResult.text);
  
  return {
    text: transcriptionResult.text,
    metadata: {
      model: options.model,
      language: options.language,
      dictionaryApplied: Boolean(options.dictionaryEntries?.length),
      textImproved: Boolean(options.fixText),
      translated: Boolean(options.targetLanguage && options.targetLanguage !== "auto"),
      processingTime,
      // Note: OpenAI doesn't provide token count for transcription API
    }
  };
}

/**
 * Legacy transcription workflow for fallback compatibility
 * Uses the existing enhancedTextProcessing approach
 */
export async function legacyTranscriptionWorkflow(
  openai: OpenAI,
  options: UnifiedTranscriptionOptions
): Promise<UnifiedTranscriptionResult> {
  const startTime = Date.now();
  
  // Import here to avoid circular dependencies
  const { enhancedTextProcessing } = await import("./common");
  const { getPersonalDictionaryPrompt } = await import("./dictionary");
  
  // Step 1: Basic transcription
  const transcriptionResult = await measureTime(
    `Legacy transcription (${options.model})`,
    async () => {
      return await openai.audio.transcriptions.create({
        file: fs.createReadStream(options.audioFile),
        model: options.model,
        language: options.language,
      });
    }
  );
  
  let finalText = transcriptionResult.text;
  
  // Step 2: Post-processing if needed
  const needsProcessing = options.dictionaryEntries?.length || options.fixText || 
                         (options.targetLanguage && options.targetLanguage !== "auto");
  
  if (needsProcessing) {
    const dictionaryPrompt = options.dictionaryEntries?.length ? 
      await getPersonalDictionaryPrompt() : undefined;
    
    finalText = await measureTime(
      "Legacy post-processing",
      async () => {
        return await enhancedTextProcessing(finalText, openai, {
          dictionaryPrompt,
          fixText: options.fixText,
          targetLanguage: options.targetLanguage
        });
      }
    );
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    text: finalText,
    metadata: {
      model: options.model,
      language: options.language,
      dictionaryApplied: Boolean(options.dictionaryEntries?.length),
      textImproved: Boolean(options.fixText),
      translated: Boolean(options.targetLanguage && options.targetLanguage !== "auto"),
      processingTime,
    }
  };
}

/**
 * Main entry point for transcription with automatic fallback
 * Tries unified approach first, falls back to legacy if needed
 */
export async function smartTranscription(
  openai: OpenAI,
  options: UnifiedTranscriptionOptions,
  useExperimentalMode: boolean = false
): Promise<UnifiedTranscriptionResult> {
  // Use experimental unified mode if enabled
  if (useExperimentalMode) {
    try {
      console.log("🧪 Using experimental unified transcription mode");
      return await unifiedTranscription(openai, options);
    } catch (error) {
      console.warn("🔄 Unified transcription failed, falling back to legacy:", error);
      // Fall through to legacy workflow
    }
  }
  
  // Use legacy workflow
  console.log("🔄 Using legacy transcription workflow");
  return await legacyTranscriptionWorkflow(openai, options);
}