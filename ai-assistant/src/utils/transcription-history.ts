import { LocalStorage } from "@raycast/api";
import fs from "fs";

export interface TranscriptionRecord {
  id: string;
  text: string;
  timestamp: number;
  language: string;
  recordingPath: string;
  transcribed: boolean;
  transcriptionDetails?: {
    mode: "local" | "online" | "gpt4";
    model?: string;
    textCorrectionEnabled: boolean;
    targetLanguage: string;
    activeApp?: string;
  };
}

const HISTORY_KEY = "transcription_history";
const MAX_HISTORY_ITEMS = 100;

/**
 * Adds a new transcription to the history
 */
export async function addTranscriptionToHistory(
  text: string,
  language: string,
  recordingPath: string,
  details: TranscriptionRecord["transcriptionDetails"],
): Promise<void> {
  const history = await getTranscriptionHistory();

  const newRecord: TranscriptionRecord = {
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

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  // Clean up the recording file since transcription was successful
  try {
    if (fs.existsSync(recordingPath)) {
      fs.unlinkSync(recordingPath);
      console.log("Cleaned up recording after successful transcription:", recordingPath);
    }
  } catch (error) {
    console.error("Error cleaning up recording file:", error);
  }
}

/**
 * Gets the transcription history
 */
export async function getTranscriptionHistory(): Promise<TranscriptionRecord[]> {
  const historyStr = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!historyStr) return [];

  try {
    return JSON.parse(historyStr);
  } catch {
    return [];
  }
}

/**
 * Gets the last recording path
 */
export async function getLastRecordingPath(): Promise<string | null> {
  const history = await getTranscriptionHistory();
  return history[0]?.recordingPath || null;
}

/**
 * Gets recordings that should be kept (untranscribed ones)
 */
export async function getRecordingsToKeep(): Promise<Set<string>> {
  const history = await getTranscriptionHistory();
  return new Set(history.filter((record) => !record.transcribed).map((record) => record.recordingPath));
}

/**
 * Formats the transcription details into a markdown string
 */
export function formatTranscriptionDetails(record: TranscriptionRecord): string {
  const details = record.transcriptionDetails;
  if (!details) return "";

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
  }

  markdown += `**Text Correction:** ${details.textCorrectionEnabled ? "Enabled" : "Disabled"}\n`;

  if (details.activeApp) {
    markdown += `**Active Application:** ${details.activeApp}\n`;
  }

  return markdown;
}
