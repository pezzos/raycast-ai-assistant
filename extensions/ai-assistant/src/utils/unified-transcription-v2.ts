import OpenAI from "openai";
import fs from "fs";
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
    apiCalls: number;
  };
}

/**
 * Builds a dictionary prompt for transcription that integrates personal corrections
 * into the OpenAI Whisper transcription process
 */
function buildDictionaryPrompt(dictionaryEntries?: DictionaryEntry[]): string {
  if (!dictionaryEntries || dictionaryEntries.length === 0) {
    return "";
  }

  // Format dictionary entries for Whisper prompt
  const corrections = dictionaryEntries
    .map((entry) => `"${entry.original}" should be "${entry.correction}"`)
    .join(", ");

  return `Personal dictionary: ${corrections}.`;
}

/**
 * Builds a unified post-processing prompt that combines text improvement and translation
 */
function buildPostProcessingPrompt(options: { improve?: boolean; translateTo?: string }): {
  systemPrompt: string;
  userPrompt: string;
  tasks: string[];
} {
  const tasks: string[] = [];
  let systemPrompt = "You are an expert text processing assistant.";

  if (options.improve) {
    systemPrompt +=
      " Improve grammar, punctuation, capitalization, and overall text quality while preserving meaning and tone.";
    tasks.push("improve text quality");
  }

  if (options.translateTo) {
    const languageMap: Record<string, string> = {
      en: "English",
      fr: "French",
      es: "Spanish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      ru: "Russian",
      ar: "Arabic",
    };

    const targetLangName = languageMap[options.translateTo] || options.translateTo;
    systemPrompt += ` Translate the text to ${targetLangName}, maintaining tone, style, and meaning.`;
    tasks.push(`translate to ${targetLangName}`);
  }

  systemPrompt += " Respond ONLY with the processed text, no explanations.";

  const userPrompt =
    tasks.length > 1
      ? `Please ${tasks.join(" and ")} for the following text:`
      : `Please ${tasks[0]} for the following text:`;

  return { systemPrompt, userPrompt, tasks };
}

/**
 * Performs optimized transcription with integrated dictionary corrections
 * Step 1 of the new 2-step process
 */
export async function transcribeWithDictionary(
  openai: OpenAI,
  options: {
    audioFile: string;
    model: string;
    language?: string;
    dictionaryEntries?: DictionaryEntry[];
  },
): Promise<{ text: string; metadata: any }> {
  // Build dictionary prompt for transcription
  const dictionaryPrompt = buildDictionaryPrompt(options.dictionaryEntries);

  // Perform transcription with dictionary integration
  const transcriptionResult = await performanceProfiler.measureOperation(
    "transcription-with-dictionary",
    async () => {
      return await openai.audio.transcriptions.create({
        file: fs.createReadStream(options.audioFile),
        model: options.model,
        language: options.language,
        prompt: dictionaryPrompt,
        temperature: 0.1,
      });
    },
    {
      mode: "optimized",
      step: "transcription",
      model: options.model,
      language: options.language,
      dictionaryEntries: options.dictionaryEntries?.length || 0,
      hasDictionary: Boolean(options.dictionaryEntries?.length),
    },
  );

  console.log("🎤 Transcription with dictionary:", {
    dictionaryPrompt: dictionaryPrompt || "(none)",
    result: transcriptionResult.text,
  });

  return {
    text: transcriptionResult.text,
    metadata: {
      model: options.model,
      language: options.language,
      dictionaryApplied: Boolean(options.dictionaryEntries?.length),
    },
  };
}

/**
 * Performs unified post-processing (improvement + translation)
 * Step 2 of the new 2-step process
 */
export async function unifiedPostProcessing(
  openai: OpenAI,
  text: string,
  options: {
    improve?: boolean;
    translateTo?: string;
  },
): Promise<{ text: string; metadata: any }> {
  // Build post-processing prompts
  const { systemPrompt, userPrompt, tasks } = buildPostProcessingPrompt(options);

  // Perform unified post-processing
  const processedResult = await performanceProfiler.measureOperation(
    "unified-post-processing",
    async () => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Fast model for text processing
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${userPrompt}\n\n"${text}"` },
        ],
        temperature: 0.3,
      });

      return completion.choices[0].message.content?.trim() || text;
    },
    {
      mode: "optimized",
      step: "post-processing",
      improve: options.improve,
      translateTo: options.translateTo,
      tasks: tasks.join("+"),
    },
  );

  console.log("🔧 Post-processing result:", {
    tasks: tasks.join(" + "),
    input: text.substring(0, 50) + "...",
    output: processedResult.substring(0, 50) + "...",
  });

  return {
    text: processedResult,
    metadata: {
      textImproved: Boolean(options.improve),
      translated: Boolean(options.translateTo),
      tasks,
    },
  };
}

/**
 * Main optimized transcription function with 2-step process
 */
export async function optimizedTranscription(
  openai: OpenAI,
  options: UnifiedTranscriptionOptions,
): Promise<UnifiedTranscriptionResult> {
  const startTime = Date.now();

  // Step 1: Transcription with dictionary integration
  const transcriptionResult = await transcribeWithDictionary(openai, {
    audioFile: options.audioFile,
    model: options.model,
    language: options.language,
    dictionaryEntries: options.dictionaryEntries,
  });

  let finalText = transcriptionResult.text;
  let postProcessingMetadata = {};

  // Step 2: Unified post-processing (if needed)
  const needsProcessing = options.fixText || (options.targetLanguage && options.targetLanguage !== "auto");

  if (needsProcessing) {
    const postProcessingResult = await unifiedPostProcessing(openai, finalText, {
      improve: options.fixText,
      translateTo: options.targetLanguage && options.targetLanguage !== "auto" ? options.targetLanguage : undefined,
    });

    finalText = postProcessingResult.text;
    postProcessingMetadata = postProcessingResult.metadata;
  }

  const processingTime = Date.now() - startTime;

  return {
    text: finalText,
    metadata: {
      model: options.model,
      language: options.language,
      dictionaryApplied: transcriptionResult.metadata.dictionaryApplied,
      textImproved: postProcessingMetadata.textImproved || false,
      translated: postProcessingMetadata.translated || false,
      processingTime,
      apiCalls: needsProcessing ? 2 : 1,
    },
  };
}

/**
 * Legacy transcription workflow for fallback compatibility
 * Uses the existing enhancedTextProcessing approach
 */
export async function legacyTranscriptionWorkflow(
  openai: OpenAI,
  options: UnifiedTranscriptionOptions,
): Promise<UnifiedTranscriptionResult> {
  const startTime = Date.now();

  // Import here to avoid circular dependencies
  const { enhancedTextProcessing } = await import("./common");
  const { getPersonalDictionaryPrompt } = await import("./dictionary");

  // Step 1: Basic transcription
  const transcriptionResult = await performanceProfiler.measureOperation(
    "legacy-transcription",
    async () => {
      return await openai.audio.transcriptions.create({
        file: fs.createReadStream(options.audioFile),
        model: options.model,
        language: options.language,
      });
    },
    {
      mode: "legacy",
      model: options.model,
      language: options.language,
    },
  );

  let finalText = transcriptionResult.text;

  // Step 2: Post-processing if needed
  const needsProcessing =
    options.dictionaryEntries?.length ||
    options.fixText ||
    (options.targetLanguage && options.targetLanguage !== "auto");

  if (needsProcessing) {
    const dictionaryPrompt = options.dictionaryEntries?.length ? await getPersonalDictionaryPrompt() : undefined;

    finalText = await performanceProfiler.measureOperation(
      "legacy-post-processing",
      async () => {
        return await enhancedTextProcessing(finalText, openai, {
          dictionaryPrompt,
          fixText: options.fixText,
          targetLanguage: options.targetLanguage,
        });
      },
      {
        dictionaryPrompt: Boolean(dictionaryPrompt),
        fixText: options.fixText,
        targetLanguage: options.targetLanguage,
      },
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
      apiCalls: needsProcessing ? 3 : 1, // Legacy uses more calls
    },
  };
}

/**
 * Main entry point for transcription with automatic fallback
 * Tries optimized 2-step approach first, falls back to legacy if needed
 */
export async function smartTranscription(
  openai: OpenAI,
  options: UnifiedTranscriptionOptions,
  useExperimentalMode: boolean = false,
): Promise<UnifiedTranscriptionResult> {
  // Use experimental optimized mode if enabled
  if (useExperimentalMode) {
    try {
      console.log("🧪 Using experimental optimized transcription (2-step process)");
      return await optimizedTranscription(openai, options);
    } catch (error) {
      console.warn("🔄 Optimized transcription failed, falling back to legacy:", error);
      // Fall through to legacy workflow
    }
  }

  // Use legacy workflow
  console.log("🔄 Using legacy transcription workflow");
  return await legacyTranscriptionWorkflow(openai, options);
}
