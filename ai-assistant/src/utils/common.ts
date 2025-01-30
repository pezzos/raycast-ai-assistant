import { Clipboard, showHUD, getSelectedText as raycastGetSelectedText, environment } from "@raycast/api";

/**
 * Get the current clipboard content
 * @returns Promise<string> The clipboard content
 */
export async function getClipboardContent(): Promise<string> {
  const text = await Clipboard.readText();
  return text || "";
}

/**
 * Get the currently selected text using Raycast's native API
 * @returns Promise<string> The selected text
 */
export async function getSelectedText(): Promise<string> {
  try {
    return await raycastGetSelectedText();
  } catch (error) {
    console.error("Error getting selected text:", error);
    throw new Error("No text selected");
  }
}

/**
 * Replace the selected text with new text using Raycast's native API
 * @param text The text to replace the selection with
 */
export async function replaceSelectedText(text: string): Promise<void> {
  const cleanText = text
    .replace(/^["']|["']$/g, '')  // Remove quotes at start/end
    .replace(/\n*Translation:.*$/gs, '') // Remove "Translation:" suffix if present
    .trim();

  if (!cleanText) {
    throw new Error('No text to paste');
  }

  await Clipboard.paste(cleanText);
  await showHUD("Text replaced");
}

