"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DICTIONARY_ENTRIES_KEY = void 0;
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
exports.DICTIONARY_ENTRIES_KEY = "dictate-dictionary-entries";
function Command() {
    const [entries, setEntries] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [searchText, setSearchText] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        loadEntries();
    }, []);
    async function loadEntries() {
        try {
            const savedEntries = await api_1.LocalStorage.getItem(exports.DICTIONARY_ENTRIES_KEY);
            if (savedEntries) {
                setEntries(JSON.parse(savedEntries));
            }
        }
        catch (error) {
            console.error("Error loading dictionary entries:", error);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function handleAddEntry(values) {
        try {
            const newEntry = {
                original: values.original.trim(),
                correction: values.correction.trim(),
                addedAt: Date.now(),
            };
            const updatedEntries = [...entries, newEntry];
            await api_1.LocalStorage.setItem(exports.DICTIONARY_ENTRIES_KEY, JSON.stringify(updatedEntries));
            setEntries(updatedEntries);
            await (0, api_1.showHUD)("✅ Word added to dictionary");
            // Return to dictionary view
            await (0, api_1.popToRoot)();
        }
        catch (error) {
            console.error("Error adding dictionary entry:", error);
            await (0, api_1.showHUD)("❌ Failed to add word to dictionary");
        }
    }
    async function handleEditEntry(entryToEdit, newValues) {
        try {
            const updatedEntries = entries.map((entry) => entry.addedAt === entryToEdit.addedAt
                ? { ...entry, original: newValues.original.trim(), correction: newValues.correction.trim() }
                : entry);
            await api_1.LocalStorage.setItem(exports.DICTIONARY_ENTRIES_KEY, JSON.stringify(updatedEntries));
            setEntries(updatedEntries);
            await (0, api_1.showHUD)("✅ Entry updated");
            // Return to dictionary view
            await (0, api_1.popToRoot)();
        }
        catch (error) {
            console.error("Error updating dictionary entry:", error);
            await (0, api_1.showHUD)("❌ Failed to update entry");
        }
    }
    async function handleDeleteEntry(entryToDelete) {
        try {
            const updatedEntries = entries.filter((entry) => entry.addedAt !== entryToDelete.addedAt);
            await api_1.LocalStorage.setItem(exports.DICTIONARY_ENTRIES_KEY, JSON.stringify(updatedEntries));
            setEntries(updatedEntries);
            await (0, api_1.showHUD)("✅ Word removed from dictionary");
        }
        catch (error) {
            console.error("Error deleting dictionary entry:", error);
            await (0, api_1.showHUD)("❌ Failed to remove word from dictionary");
        }
    }
    const filteredEntries = (entries || []).filter((entry) => entry.original.toLowerCase().includes(searchText.toLowerCase()) ||
        entry.correction.toLowerCase().includes(searchText.toLowerCase()));
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, searchText: searchText, onSearchTextChange: setSearchText, searchBarPlaceholder: "Search dictionary entries...", children: (0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Dictionary Entries", subtitle: (entries || []).length.toString(), children: filteredEntries.length === 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: entries.length === 0 ? "No dictionary entries" : "No results found", subtitle: entries.length === 0 ? "Add your first word to get started" : "Try a different search term", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Entry", target: (0, jsx_runtime_1.jsxs)(api_1.Form, { actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Add Word", onSubmit: handleAddEntry }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "original", title: "Original Word/Phrase", placeholder: "Enter the word or phrase that needs correction", autoFocus: true }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "correction", title: "Correction", placeholder: "Enter the correct word or phrase" })] }) }) }) })) : (filteredEntries.map((entry) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: entry.original, subtitle: entry.correction, accessories: [{ text: new Date(entry.addedAt).toLocaleDateString() }], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Edit Entry", target: (0, jsx_runtime_1.jsxs)(api_1.Form, { actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Save Changes", onSubmit: (values) => handleEditEntry(entry, values) }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "original", title: "Original Word/Phrase", defaultValue: entry.original, autoFocus: true }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "correction", title: "Correction", defaultValue: entry.correction })] }) }), (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add New Word", target: (0, jsx_runtime_1.jsxs)(api_1.Form, { actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Add Word", onSubmit: handleAddEntry }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "original", title: "Original Word/Phrase", placeholder: "Enter the word or phrase that needs correction", autoFocus: true }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "correction", title: "Correction", placeholder: "Enter the correct word or phrase" })] }) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete Entry", style: api_1.Action.Style.Destructive, onAction: () => handleDeleteEntry(entry), shortcut: { modifiers: ["cmd"], key: "backspace" } })] }) }, entry.addedAt)))) }) }));
}
