"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClipboardContent = getClipboardContent;
exports.getSelectedText = getSelectedText;
exports.cleanOutputText = cleanOutputText;
exports.replaceSelectedText = replaceSelectedText;
exports.getLLMModel = getLLMModel;
exports.enhancedTextProcessing = enhancedTextProcessing;
exports.cleanText = cleanText;
const api_1 = require("@raycast/api");
/**
 * Get the current clipboard content
 * @returns Promise<string> The clipboard content
 */
async function getClipboardContent() {
    const text = await api_1.Clipboard.readText();
    return text || "";
}
/**
 * Get the currently selected text using Raycast's native API
 * @returns Promise<string> The selected text
 */
async function getSelectedText() {
    try {
        return await (0, api_1.getSelectedText)();
    }
    catch (error) {
        console.error("Error getting selected text:", error);
        throw new Error("No text selected");
    }
}
/**
 * Clean text by removing unwanted quotes and suffixes
 * @param text The text to clean
 * @returns string The cleaned text
 */
function cleanOutputText(text) {
    return text
        .replace(/^["'""]|["'""]$/g, "") // Remove various quotes at start/end (straight and curly quotes)
        .replace(/\n*Translation:.*$/gs, "") // Remove "Translation:" suffix if present
        .trim();
}
/**
 * Replace the selected text with new text using Raycast's native API
 * @param text The text to replace the selection with
 */
async function replaceSelectedText(text) {
    const cleanText = cleanOutputText(text);
    if (!cleanText) {
        throw new Error("No text to paste");
    }
    await api_1.Clipboard.paste(cleanText);
    await (0, api_1.showHUD)("Text replaced");
}
/**
 * Get the LLM model from preferences
 * @returns string The model name to use
 */
function getLLMModel() {
    const preferences = (0, api_1.getPreferenceValues)();
    return preferences.llmModel || "gpt-4o-mini";
}
/**
 * Enhanced text processing that combines dictionary corrections, text improvement, and translation in one call
 * @param text The text to process
 * @param openai OpenAI instance
 * @param options Processing options
 * @returns Promise<string> The processed text
 */
async function enhancedTextProcessing(text, openai, options) {
    const { dictionaryPrompt, fixText, targetLanguage } = options;
    // If no processing needed, return original text
    if (!dictionaryPrompt && !fixText && (!targetLanguage || targetLanguage === "auto")) {
        return text;
    }
    // Build comprehensive system prompt
    let systemPrompt = "You are an advanced text processing assistant.";
    const tasks = [];
    if (dictionaryPrompt) {
        systemPrompt += " Apply personal dictionary corrections while preserving original meaning.";
        tasks.push("Apply personal dictionary corrections");
    }
    if (fixText) {
        systemPrompt += " Improve text clarity, grammar, and punctuation.";
        tasks.push("Improve grammar and clarity");
    }
    if (targetLanguage && targetLanguage !== "auto") {
        systemPrompt += ` Translate the text to ${targetLanguage} while maintaining tone and style.`;
        tasks.push(`Translate to ${targetLanguage}`);
    }
    systemPrompt += " Respond ONLY with the processed text.";
    // Build user prompt
    let userPrompt = "";
    if (dictionaryPrompt) {
        userPrompt += `${dictionaryPrompt}\n\n`;
    }
    userPrompt += `Tasks to perform in order: ${tasks.join(", ")}\n\n`;
    userPrompt += `Original text: "${text}"\n\n`;
    userPrompt += "Processed text:";
    const completion = await openai.chat.completions.create({
        model: getLLMModel(),
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
    });
    return completion.choices[0].message.content?.trim() || text;
}
/**
 * Clean and improve text using OpenAI
 * @param text The text to clean
 * @param openai OpenAI instance
 * @returns Promise<string> The cleaned text
 */
async function cleanText(text, openai) {
    const completion = await openai.chat.completions.create({
        model: getLLMModel(),
        messages: [
            {
                role: "system",
                content: "You are a text improvement assistant. Fix grammar, punctuation, and spelling while preserving the original meaning and tone. Respond ONLY with the corrected text.",
            },
            {
                role: "user",
                content: text,
            },
        ],
        temperature: 0.3,
    });
    return completion.choices[0].message.content?.trim() || text;
}
