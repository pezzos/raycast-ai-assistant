"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSelectedText = validateSelectedText;
const api_1 = require("@raycast/api");
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Enhanced clipboard operations with adaptive delays
 */
const enhancedClipboardOps = {
    copy: async (text) => {
        await api_1.Clipboard.copy(text);
        // Base delay of 50ms, plus 1ms per character, capped at 200ms
        const delay = Math.min(50 + text.length, 200);
        console.log("Copy delay:", delay);
        await new Promise((resolve) => setTimeout(resolve, delay));
    },
    paste: async (text) => {
        await api_1.Clipboard.paste({ text });
        // For paste, we need slightly longer delays
        // Base delay of 100ms, plus 2ms per character, capped at 300ms
        const delay = Math.min(100 + text.length * 2, 300);
        console.log("Paste delay:", delay);
        await new Promise((resolve) => setTimeout(resolve, delay));
    },
};
/**
 * Simulates keyboard selection using osascript
 * @param characters Number of characters to select (from right to left)
 */
async function selectLeftCharacters(characters) {
    // For very short selections, use character by character selection
    if (characters <= 10) {
        const script = `
      tell application "System Events"
        repeat ${characters} times
          key code 123 using shift down
        end repeat
        delay 0.005
      end tell
    `;
        await execAsync(`osascript -e '${script}'`);
        return;
    }
    // For single words or when unsure, use character selection with adaptive delay
    const delay = characters * 0.005;
    console.log("Select left delay:", delay);
    const script = `
        tell application "System Events"
        repeat ${characters} times
            key code 123 using shift down
        end repeat
        delay ${delay}
        end tell
    `;
    await execAsync(`osascript -e '${script}'`);
}
async function selectRightCharacters(characters) {
    // For marker selection, we keep it simple as it's always a single character
    const script = `
    tell application "System Events"
      repeat ${characters} times
        key code 124 using shift down
      end repeat
      delay 0.005
    end tell
  `;
    await execAsync(`osascript -e '${script}'`);
}
/**
 * Try to modify the text by adding a marker and checking if we can select and remove it
 * @param originalText The original selected text
 * @returns Promise<TextValidationResult> The validation result
 */
async function tryModifyText(originalText) {
    const isEditable = true;
    const reason = "Text successfully modified";
    const marker = "|";
    if (!originalText.trim()) {
        return {
            isEditable: false,
            reason: "Empty text selection",
        };
    }
    const originalClipboard = await api_1.Clipboard.read();
    try {
        // Clear the clipboard and paste the original text
        // Return false if it fails
        try {
            await enhancedClipboardOps.paste("");
            await enhancedClipboardOps.paste(originalText);
        }
        catch (error) {
            return {
                isEditable: false,
                reason: "Text is not editable - paste operation failed",
            };
        }
        // Paste the marker and select it
        // Return false if the marker is not selected or if it's stillthe original text
        await enhancedClipboardOps.paste(marker);
        await selectLeftCharacters(marker.length);
        const selection = await (0, api_1.getSelectedText)();
        if (selection.length !== marker.length || selection === originalText || selection !== marker) {
            await selectRightCharacters(marker.length);
            return {
                isEditable: false,
                reason: "Could not select marker - text is probably not editable",
            };
        }
        // Clear the clipboard and paste the original text
        await enhancedClipboardOps.paste("");
        await selectLeftCharacters(originalText.length);
        return {
            isEditable,
            reason,
        };
    }
    catch (error) {
        return {
            isEditable: false,
            reason: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
    finally {
        try {
            await api_1.Clipboard.copy(originalClipboard.text);
        }
        catch (error) {
            console.error("Error restoring clipboard:", error);
        }
    }
}
/**
 * Validates if the current selected text is editable by attempting to modify it
 * @returns Promise<TextValidationResult> The validation result
 */
async function validateSelectedText() {
    console.log("Starting text validation...");
    let selectedText;
    try {
        selectedText = await (0, api_1.getSelectedText)();
        console.log("Selected text:", selectedText);
    }
    catch (error) {
        // Log the full error for debugging
        console.error("Error getting selected text:", error);
        // Check for specific error message
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Unable to get selected text")) {
            return {
                isEditable: false,
                reason: "Please select some text first",
            };
        }
        // Handle other potential errors
        return {
            isEditable: false,
            reason: "Failed to access text selection",
        };
    }
    // Handle empty selection after successful getSelectedText
    if (!selectedText.trim()) {
        return {
            isEditable: false,
            reason: "The selected text is empty",
        };
    }
    // Try to modify the text to check if it's editable
    return await tryModifyText(selectedText);
}
