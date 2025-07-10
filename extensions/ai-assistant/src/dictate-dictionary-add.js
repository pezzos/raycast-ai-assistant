"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const dictate_dictionary_1 = require("./dictate-dictionary");
function Command() {
    const [selectedWord, setSelectedWord] = (0, react_1.useState)("");
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        loadSelectedWord();
    }, []);
    async function loadSelectedWord() {
        try {
            const text = await (0, api_1.getSelectedText)();
            setSelectedWord(text.trim());
        }
        catch (error) {
            console.error("Error getting selected text:", error);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function handleSubmit(values) {
        try {
            if (!selectedWord) {
                await (0, api_1.showHUD)("❌ No word selected");
                return;
            }
            // Load existing entries
            const savedEntries = await api_1.LocalStorage.getItem(dictate_dictionary_1.DICTIONARY_ENTRIES_KEY);
            const entries = savedEntries ? JSON.parse(savedEntries) : [];
            // Add new entry
            const newEntry = {
                original: selectedWord,
                correction: values.correction.trim(),
                addedAt: Date.now(),
            };
            const updatedEntries = [...entries, newEntry];
            await api_1.LocalStorage.setItem(dictate_dictionary_1.DICTIONARY_ENTRIES_KEY, JSON.stringify(updatedEntries));
            await (0, api_1.showHUD)("✅ Word added to dictionary");
            // Navigate to dictionary view
            await (0, api_1.launchCommand)({
                name: "dictate-dictionary",
                type: api_1.LaunchType.UserInitiated,
            });
        }
        catch (error) {
            console.error("Error adding word to dictionary:", error);
            await (0, api_1.showHUD)("❌ Failed to add word to dictionary");
        }
    }
    if (!selectedWord) {
        return ((0, jsx_runtime_1.jsx)(api_1.Form, { children: (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Please select a word or phrase to add to the dictionary" }) }));
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { isLoading: isLoading, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Add to Dictionary", onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Add selected word to personal dictionary" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "original", title: "Selected Word/Phrase", value: selectedWord }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "correction", title: "Correction", placeholder: "Enter the correct word or phrase", autoFocus: true })] }));
}
