"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTranscriptionToHistory = addTranscriptionToHistory;
exports.getTranscriptionHistory = getTranscriptionHistory;
exports.getLastRecordingPath = getLastRecordingPath;
exports.getRecordingsToKeep = getRecordingsToKeep;
exports.cleanupOldRecordings = cleanupOldRecordings;
exports.formatTranscriptionDetails = formatTranscriptionDetails;
const api_1 = require("@raycast/api");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const HISTORY_KEY = "transcription_history";
const MAX_HISTORY_ITEMS = 100;
/**
 * Adds a new transcription to the history without deleting the file
 */
async function addTranscriptionToHistory(text, language, recordingPath, details) {
    console.log("Adding transcription to history:", {
        textLength: text.length,
        language,
        recordingPath,
        details,
    });
    const history = await getTranscriptionHistory();
    const newRecord = {
        id: Date.now().toString(),
        text,
        timestamp: Date.now(),
        language,
        recordingPath,
        transcribed: true,
        transcriptionDetails: details,
    };
    history.unshift(newRecord);
    // Keep only the last MAX_HISTORY_ITEMS items
    if (history.length > MAX_HISTORY_ITEMS) {
        history.length = MAX_HISTORY_ITEMS;
    }
    await api_1.LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
/**
 * Gets the transcription history
 */
async function getTranscriptionHistory() {
    const historyStr = await api_1.LocalStorage.getItem(HISTORY_KEY);
    if (!historyStr)
        return [];
    try {
        return JSON.parse(historyStr);
    }
    catch {
        return [];
    }
}
/**
 * Gets the last recording path
 */
async function getLastRecordingPath() {
    const history = await getTranscriptionHistory();
    return history[0]?.recordingPath || null;
}
/**
 * Gets recordings that should be kept (untranscribed ones or recent ones)
 */
async function getRecordingsToKeep() {
    const history = await getTranscriptionHistory();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return new Set(history
        .filter((record) => !record.transcribed || record.timestamp > oneHourAgo)
        .map((record) => record.recordingPath));
}
/**
 * Clean up old recordings (older than 1 hour and successfully transcribed)
 */
async function cleanupOldRecordings(directory) {
    console.log("Starting cleanup of old recordings in:", directory);
    const recordingsToKeep = await getRecordingsToKeep();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    try {
        const files = fs_1.default.readdirSync(directory);
        for (const file of files) {
            const filePath = path_1.default.join(directory, file);
            const stats = fs_1.default.statSync(filePath);
            if (stats.mtimeMs < oneHourAgo &&
                file.startsWith("recording-") &&
                file.endsWith(".wav") &&
                !recordingsToKeep.has(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                    console.log("Cleaned up old recording:", filePath);
                }
                catch (error) {
                    console.error("Error deleting file:", filePath, error);
                }
            }
        }
    }
    catch (error) {
        console.error("Error during recordings cleanup:", error);
    }
}
/**
 * Formats the transcription details into a markdown string
 */
function formatTranscriptionDetails(record) {
    const details = record.transcriptionDetails;
    if (!details)
        return "";
    const date = new Date(record.timestamp);
    const formattedDate = date.toLocaleString();
    let markdown = `## Transcription Details\n\n`;
    markdown += `**Date:** ${formattedDate}\n\n`;
    markdown += `**Language:** ${record.language}\n`;
    if (details.targetLanguage !== "auto") {
        markdown += `**Target Language:** ${details.targetLanguage}\n`;
    }
    markdown += `**Transcription Mode:** `;
    switch (details.mode) {
        case "local":
            markdown += `Local Whisper (Model: ${details.model})\n`;
            break;
        case "online":
            markdown += `OpenAI Whisper\n`;
            break;
        case "gpt4":
            markdown += `GPT-4 Audio\n`;
            break;
        case "transcribe":
            markdown += `gpt-4o Transcribe (Model: ${details.model})\n`;
            break;
    }
    markdown += `**Text Correction:** ${details.textCorrectionEnabled ? "Enabled" : "Disabled"}\n`;
    if (details.activeApp) {
        markdown += `**Active Application:** ${details.activeApp}\n`;
    }
    return markdown;
}
