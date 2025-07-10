"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonalDictionaryPrompt = getPersonalDictionaryPrompt;
const api_1 = require("@raycast/api");
const dictate_dictionary_1 = require("../dictate-dictionary");
/**
 * Get the personal dictionary entries as a formatted string for the AI prompt
 * @returns A string containing the dictionary entries in a format suitable for the AI prompt
 */
async function getPersonalDictionaryPrompt() {
    try {
        const savedEntries = await api_1.LocalStorage.getItem(dictate_dictionary_1.DICTIONARY_ENTRIES_KEY);
        if (!savedEntries) {
            return "";
        }
        const entries = JSON.parse(savedEntries);
        if (entries.length === 0) {
            return "";
        }
        const formattedEntries = entries
            .map((entry) => `"${entry.original}" should be transcribed as "${entry.correction}"`)
            .join("\n");
        return `
Here is a list of personal dictionary entries to use for improving transcription accuracy:

${formattedEntries}

Please use these corrections when transcribing the text, but only when you are confident that the word or phrase matches exactly.
`;
    }
    catch (error) {
        console.error("Error getting dictionary entries:", error);
        return "";
    }
}
