"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const performance_profiler_1 = require("./utils/performance-profiler");
function Command() {
    const [performanceData, setPerformanceData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [selectedDays, setSelectedDays] = (0, react_1.useState)(7);
    (0, react_1.useEffect)(() => {
        loadPerformanceData();
    }, [selectedDays]);
    const loadPerformanceData = async () => {
        setIsLoading(true);
        try {
            const data = await performance_profiler_1.performanceProfiler.getPerformanceStats(undefined, selectedDays);
            setPerformanceData(data);
        }
        catch (error) {
            console.error("Failed to load performance data:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed to load performance data",
                message: error instanceof Error ? error.message : "Unknown error",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const formatDuration = (ms) => {
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };
    const getPerformanceIcon = (avgTime, operation) => {
        // Seuils spécifiques par type d'opération
        if (operation.includes("transcription")) {
            if (avgTime < 2000)
                return "🟢"; // < 2s très rapide
            if (avgTime < 5000)
                return "🟡"; // < 5s acceptable
            return "🔴"; // > 5s lent
        }
        if (operation.includes("llm") || operation.includes("prompt")) {
            if (avgTime < 3000)
                return "🟢"; // < 3s très rapide
            if (avgTime < 8000)
                return "🟡"; // < 8s acceptable
            return "🔴"; // > 8s lent
        }
        if (operation.includes("recording")) {
            return "🎙️"; // Dépend de l'utilisateur
        }
        // Seuils généraux
        if (avgTime < 1000)
            return "🟢";
        if (avgTime < 3000)
            return "🟡";
        return "🔴";
    };
    const getSummaryStats = () => {
        if (!performanceData)
            return null;
        const whisperLocal = Object.entries(performanceData.averages)
            .filter(([key]) => key.includes("local") && key.includes("transcription"))
            .map(([, time]) => time);
        const whisperCloud = Object.entries(performanceData.averages)
            .filter(([key]) => key.includes("cloud-transcription"))
            .map(([, time]) => time);
        const llmOperations = Object.entries(performanceData.averages)
            .filter(([key]) => key.includes("llm") || key.includes("prompt"))
            .map(([, time]) => time);
        return {
            whisperLocalAvg: whisperLocal.length > 0 ? whisperLocal.reduce((a, b) => a + b, 0) / whisperLocal.length : null,
            whisperCloudAvg: whisperCloud.length > 0 ? whisperCloud.reduce((a, b) => a + b, 0) / whisperCloud.length : null,
            llmAvg: llmOperations.length > 0 ? llmOperations.reduce((a, b) => a + b, 0) / llmOperations.length : null,
            totalSessions: performanceData.sessions.length,
        };
    };
    const summaryStats = getSummaryStats();
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { isLoading: isLoading, searchBarPlaceholder: "Search performance metrics...", navigationTitle: "Performance Statistics", searchBarAccessory: (0, jsx_runtime_1.jsxs)(api_1.List.Dropdown, { tooltip: "Time Period", value: selectedDays.toString(), onChange: (value) => setSelectedDays(parseInt(value)), children: [(0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: "Last 24 hours", value: "1" }), (0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: "Last 3 days", value: "3" }), (0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: "Last week", value: "7" }), (0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: "Last month", value: "30" })] }), children: [summaryStats && ((0, jsx_runtime_1.jsxs)(api_1.List.Section, { title: "Summary", children: [(0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Total Sessions", subtitle: `${summaryStats.totalSessions} sessions analyzed`, icon: "\uD83D\uDCCA" }), summaryStats.whisperLocalAvg && ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Whisper Local Average", subtitle: formatDuration(summaryStats.whisperLocalAvg), icon: getPerformanceIcon(summaryStats.whisperLocalAvg, "transcription"), accessories: [{ text: "Local Processing" }] })), summaryStats.whisperCloudAvg && ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Whisper Cloud Average", subtitle: formatDuration(summaryStats.whisperCloudAvg), icon: getPerformanceIcon(summaryStats.whisperCloudAvg, "transcription"), accessories: [{ text: "OpenAI API" }] })), summaryStats.llmAvg && ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "LLM Operations Average", subtitle: formatDuration(summaryStats.llmAvg), icon: getPerformanceIcon(summaryStats.llmAvg, "llm"), accessories: [{ text: "Text Generation" }] })), summaryStats.whisperLocalAvg && summaryStats.whisperCloudAvg && ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Local vs Cloud Comparison", subtitle: summaryStats.whisperLocalAvg < summaryStats.whisperCloudAvg
                            ? `Local is ${formatDuration(summaryStats.whisperCloudAvg - summaryStats.whisperLocalAvg)} faster`
                            : `Cloud is ${formatDuration(summaryStats.whisperLocalAvg - summaryStats.whisperCloudAvg)} faster`, icon: summaryStats.whisperLocalAvg < summaryStats.whisperCloudAvg ? "🏠" : "☁️", accessories: [
                            {
                                text: `${((Math.abs(summaryStats.whisperLocalAvg - summaryStats.whisperCloudAvg) /
                                    Math.max(summaryStats.whisperLocalAvg, summaryStats.whisperCloudAvg)) *
                                    100).toFixed(1)}% difference`,
                            },
                        ] }))] })), (0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Detailed Operations", children: performanceData &&
                    Object.entries(performanceData.averages)
                        .sort(([, a], [, b]) => b - a) // Sort by duration descending
                        .map(([operation, avgTime]) => {
                        const trends = performanceData.trends[operation] || [];
                        const sampleCount = trends.length;
                        const minTime = Math.min(...trends);
                        const maxTime = Math.max(...trends);
                        return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: operation.replace(/::/g, " → "), subtitle: `Average: ${formatDuration(avgTime)}`, icon: getPerformanceIcon(avgTime, operation), accessories: [
                                { text: `${sampleCount} samples` },
                                { text: `${formatDuration(minTime)} - ${formatDuration(maxTime)}` },
                            ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Operation Name", content: operation }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Statistics", content: `${operation}: avg ${formatDuration(avgTime)}, samples: ${sampleCount}, range: ${formatDuration(minTime)} - ${formatDuration(maxTime)}` })] }) }, operation));
                    }) }), (0, jsx_runtime_1.jsxs)(api_1.List.Section, { title: "Actions", children: [(0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Clean Old Performance Data", subtitle: "Remove performance data older than 30 days", icon: "\uD83D\uDDD1\uFE0F", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Clean Old Data", onAction: async () => {
                                    try {
                                        await performance_profiler_1.performanceProfiler.cleanup(30);
                                        await (0, api_1.showToast)({
                                            style: api_1.Toast.Style.Success,
                                            title: "Performance data cleaned",
                                        });
                                        await loadPerformanceData();
                                    }
                                    catch (error) {
                                        await (0, api_1.showToast)({
                                            style: api_1.Toast.Style.Failure,
                                            title: "Failed to clean data",
                                            message: error instanceof Error ? error.message : "Unknown error",
                                        });
                                    }
                                } }) }) }), (0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Refresh Data", subtitle: "Reload performance statistics", icon: "\uD83D\uDD04", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh", onAction: loadPerformanceData }) }) })] })] }));
}
