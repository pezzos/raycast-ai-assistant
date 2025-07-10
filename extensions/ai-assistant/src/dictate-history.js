"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const transcription_history_1 = require("./utils/transcription-history");
const date_fns_1 = require("date-fns");
function Command() {
    const [history, setHistory] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [selectedRecord, setSelectedRecord] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        loadHistory();
    }, []);
    async function loadHistory() {
        try {
            const records = await (0, transcription_history_1.getTranscriptionHistory)();
            setHistory(records);
            if (records.length > 0) {
                setSelectedRecord(records[0]);
            }
        }
        catch (error) {
            console.error("Error loading history:", error);
        }
        finally {
            setIsLoading(false);
        }
    }
    async function copyPasteAndClose(text) {
        await api_1.Clipboard.paste(text);
        await (0, api_1.closeMainWindow)();
    }
    if (isLoading) {
        return (0, jsx_runtime_1.jsx)(api_1.List, { isLoading: true });
    }
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, navigationTitle: "Dictation History", searchBarPlaceholder: "Search transcriptions...", onSelectionChange: (id) => {
            const record = history.find((r) => r.id === id);
            if (record) {
                setSelectedRecord(record);
            }
        }, selectedItemId: selectedRecord?.id, children: (0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Transcription History", subtitle: `${history.length} items`, children: history.map((record) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: record.id, title: record.text, subtitle: `Language: ${record.language}`, accessories: [
                    {
                        text: (0, date_fns_1.formatDistanceToNow)(record.timestamp, { addSuffix: true }),
                        tooltip: new Date(record.timestamp).toLocaleString(),
                    },
                ], detail: (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { markdown: (0, transcription_history_1.formatTranscriptionDetails)(record), metadata: (0, jsx_runtime_1.jsxs)(api_1.List.Item.Detail.Metadata, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList, { title: "Status", children: (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList.Item, { text: record.transcribed ? "Transcribed" : "Failed", color: record.transcribed ? "#2BBA52" : "#FF6363" }) }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Date", text: new Date(record.timestamp).toLocaleString(), icon: api_1.Icon.Calendar }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Language", text: record.language, icon: api_1.Icon.Globe }), record.transcriptionDetails?.targetLanguage !== "auto" && ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Target Language", text: record.transcriptionDetails?.targetLanguage, icon: api_1.Icon.Switch })), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Transcription Mode", text: record.transcriptionDetails?.mode === "local"
                                    ? `Local Whisper (${record.transcriptionDetails.model})`
                                    : record.transcriptionDetails?.mode === "gpt4"
                                        ? "GPT-4 Audio"
                                        : "OpenAI Whisper", icon: api_1.Icon.Microphone }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Text Correction", text: record.transcriptionDetails?.textCorrectionEnabled ? "Enabled" : "Disabled", icon: record.transcriptionDetails?.textCorrectionEnabled ? api_1.Icon.CheckCircle : api_1.Icon.Circle }), record.transcriptionDetails?.activeApp && ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Active Application", text: record.transcriptionDetails.activeApp, icon: api_1.Icon.Window }))] }) }), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Copy, Paste and Close", icon: api_1.Icon.TextCursor, onAction: () => copyPasteAndClose(record.text) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Copy and Close", icon: api_1.Icon.Clipboard, onAction: () => {
                                        api_1.Clipboard.copy(record.text);
                                        (0, api_1.closeMainWindow)();
                                    }, shortcut: { modifiers: ["cmd"], key: "return" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Copy", icon: api_1.Icon.Clipboard, onAction: () => api_1.Clipboard.copy(record.text) })] }), !record.transcribed && ((0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Retry Transcription", icon: api_1.Icon.ArrowClockwise, onAction: () => {
                                    // TODO: Implement retry transcription
                                } }) }))] }) }, record.id))) }) }));
}
