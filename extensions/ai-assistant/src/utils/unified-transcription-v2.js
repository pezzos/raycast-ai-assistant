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
exports.transcribeWithDictionary = transcribeWithDictionary;
exports.unifiedPostProcessing = unifiedPostProcessing;
exports.optimizedTranscription = optimizedTranscription;
exports.legacyTranscriptionWorkflow = legacyTranscriptionWorkflow;
exports.smartTranscription = smartTranscription;
const fs_1 = __importDefault(require("fs"));
const performance_profiler_1 = require("./performance-profiler");
/**
 * Builds a dictionary prompt for transcription that integrates personal corrections
 * into the OpenAI Whisper transcription process
 */
function buildDictionaryPrompt(dictionaryEntries) {
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
function buildPostProcessingPrompt(options) {
    const tasks = [];
    let systemPrompt = "You are an expert text processing assistant.";
    if (options.improve) {
        systemPrompt +=
            " Improve grammar, punctuation, capitalization, and overall text quality while preserving meaning and tone.";
        tasks.push("improve text quality");
    }
    if (options.translateTo) {
        const languageMap = {
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
    const userPrompt = tasks.length > 1
        ? `Please ${tasks.join(" and ")} for the following text:`
        : `Please ${tasks[0]} for the following text:`;
    return { systemPrompt, userPrompt, tasks };
}
/**
 * Performs optimized transcription with integrated dictionary corrections
 * Step 1 of the new 2-step process
 */
async function transcribeWithDictionary(openai, options) {
    // Build dictionary prompt for transcription
    const dictionaryPrompt = buildDictionaryPrompt(options.dictionaryEntries);
    // Perform transcription with dictionary integration
    const transcriptionResult = await performance_profiler_1.performanceProfiler.measureOperation("transcription-with-dictionary", async () => {
        return await openai.audio.transcriptions.create({
            file: fs_1.default.createReadStream(options.audioFile),
            model: options.model,
            language: options.language,
            prompt: dictionaryPrompt,
            temperature: 0.1,
        });
    }, {
        mode: "optimized",
        step: "transcription",
        model: options.model,
        language: options.language,
        dictionaryEntries: options.dictionaryEntries?.length || 0,
        hasDictionary: Boolean(options.dictionaryEntries?.length),
    });
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
async function unifiedPostProcessing(openai, text, options) {
    // Build post-processing prompts
    const { systemPrompt, userPrompt, tasks } = buildPostProcessingPrompt(options);
    // Perform unified post-processing
    const processedResult = await performance_profiler_1.performanceProfiler.measureOperation("unified-post-processing", async () => {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Fast model for text processing
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `${userPrompt}\n\n"${text}"` },
            ],
            temperature: 0.3,
        });
        return completion.choices[0].message.content?.trim() || text;
    }, {
        mode: "optimized",
        step: "post-processing",
        improve: options.improve,
        translateTo: options.translateTo,
        tasks: tasks.join("+"),
    });
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
async function optimizedTranscription(openai, options) {
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
async function legacyTranscriptionWorkflow(openai, options) {
    const startTime = Date.now();
    // Import here to avoid circular dependencies
    const { enhancedTextProcessing } = await Promise.resolve().then(() => __importStar(require("./common")));
    const { getPersonalDictionaryPrompt } = await Promise.resolve().then(() => __importStar(require("./dictionary")));
    // Step 1: Basic transcription
    const transcriptionResult = await performance_profiler_1.performanceProfiler.measureOperation("legacy-transcription", async () => {
        return await openai.audio.transcriptions.create({
            file: fs_1.default.createReadStream(options.audioFile),
            model: options.model,
            language: options.language,
        });
    }, {
        mode: "legacy",
        model: options.model,
        language: options.language,
    });
    let finalText = transcriptionResult.text;
    // Step 2: Post-processing if needed
    const needsProcessing = options.dictionaryEntries?.length ||
        options.fixText ||
        (options.targetLanguage && options.targetLanguage !== "auto");
    if (needsProcessing) {
        const dictionaryPrompt = options.dictionaryEntries?.length ? await getPersonalDictionaryPrompt() : undefined;
        finalText = await performance_profiler_1.performanceProfiler.measureOperation("legacy-post-processing", async () => {
            return await enhancedTextProcessing(finalText, openai, {
                dictionaryPrompt,
                fixText: options.fixText,
                targetLanguage: options.targetLanguage,
            });
        }, {
            dictionaryPrompt: Boolean(dictionaryPrompt),
            fixText: options.fixText,
            targetLanguage: options.targetLanguage,
        });
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
async function smartTranscription(openai, options, useExperimentalMode = false) {
    // Use experimental optimized mode if enabled
    if (useExperimentalMode) {
        try {
            console.log("🧪 Using experimental optimized transcription (2-step process)");
            return await optimizedTranscription(openai, options);
        }
        catch (error) {
            console.warn("🔄 Optimized transcription failed, falling back to legacy:", error);
            // Fall through to legacy workflow
        }
    }
    // Use legacy workflow
    console.log("🔄 Using legacy transcription workflow");
    return await legacyTranscriptionWorkflow(openai, options);
}
