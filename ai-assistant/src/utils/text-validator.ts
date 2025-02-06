import { getSelectedText, Clipboard, getFrontmostApplication } from "@raycast/api";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

/**
 * Result of text validation
 */
export interface TextValidationResult {
  isEditable: boolean;
  reason?: string;
  details?: {
    application?: string;
    initialSelection?: string;
    modifiedSelection?: string;
  };
}

/**
 * Simulates keyboard selection using osascript
 * @param characters Number of characters to select (from right to left)
 */
async function selectLeftCharacters(characters: number): Promise<void> {
  const script = `
    tell application "System Events"
      repeat ${characters} times
        key code 123 using shift down
      end repeat
    end tell
  `;
  await execAsync(`osascript -e '${script}'`);
}

/**
 * Simulates delete key press using osascript
 */
async function pressDelete(): Promise<void> {
  const script = `
    tell application "System Events"
      key code 51  # delete key
    end tell
  `;
  await execAsync(`osascript -e '${script}'`);
}

/**
 * Try to modify the text by adding a marker and checking if we can select and remove it
 * @param originalText The original selected text
 * @returns Promise<TextValidationResult> The validation result
 */
async function tryModifyText(originalText: string): Promise<TextValidationResult> {
  // Store original clipboard content
  const originalClipboard = await Clipboard.read();
  console.log("Original clipboard content:", originalClipboard.text.substring(0, 20));

  try {
    console.log("Attempting to modify text...");

    // Get current application
    const currentApp = await getFrontmostApplication();
    console.log("Current application:", currentApp?.name || "Unknown", "Bundle ID:", currentApp?.bundleId || "Unknown");

    // First, verify we can still select the original text
    const currentSelection = await getSelectedText();
    console.log("Initial selection:", currentSelection);

    if (currentSelection !== originalText) {
      return {
        isEditable: false,
        reason: "Lost original selection",
        details: {
          application: currentApp?.name,
          initialSelection: currentSelection,
        }
      };
    }

    // First try: delete the selection and paste it back
    await pressDelete();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try to paste the original text back
    await Clipboard.copy(originalText);
    await Clipboard.paste({ text: originalText });
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the text was pasted correctly
    const afterPaste = await getSelectedText();
    if (afterPaste !== originalText) {
      return {
        isEditable: false,
        reason: "Could not modify text - paste failed",
        details: {
          application: currentApp?.name,
          initialSelection: currentSelection,
          modifiedSelection: afterPaste,
        }
      };
    }

    // Add a marker to the text
    const marker = "§";
    await Clipboard.copy(marker);
    await Clipboard.paste({ text: marker });

    // Small delay to ensure the paste operation is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try to select the marker
    await selectLeftCharacters(marker.length);

    // Small delay to ensure the selection is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if we selected exactly the marker
    const markerSelection = await getSelectedText();
    console.log("Marker selection:", markerSelection);

    if (markerSelection !== marker) {
      return {
        isEditable: false,
        reason: "Could not select marker - text is probably not editable",
        details: {
          application: currentApp?.name,
          initialSelection: currentSelection,
          modifiedSelection: markerSelection,
        }
      };
    }

    // Delete the marker
    await pressDelete();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Select the original text
    await selectLeftCharacters(originalText.length);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify we selected the original text
    const finalSelection = await getSelectedText();
    console.log("Final selection:", finalSelection);

    const restorationSuccessful = finalSelection === originalText;
    return {
      isEditable: true,
      reason: restorationSuccessful ? "Text successfully modified and restored" : "Text modified but restoration failed",
      details: {
        application: currentApp?.name,
        initialSelection: currentSelection,
        modifiedSelection: finalSelection,
      }
    };

  } catch (error) {
    console.error("Error during modification test:", error);
    return {
      isEditable: false,
      reason: error instanceof Error ? error.message : "Unknown error occurred",
    };
  } finally {
    // Always restore original clipboard content
    console.log("Restoring original clipboard content...");
    try {
      await Clipboard.copy(originalClipboard.text);
    } catch (error) {
      console.error("Error restoring clipboard:", error);
    }
  }
}

/**
 * Validates if the current selected text is editable by attempting to modify it
 * @returns Promise<TextValidationResult> The validation result
 */
export async function validateSelectedText(): Promise<TextValidationResult> {
  try {
    console.log("Starting text validation...");

    const selectedText = await getSelectedText();
    console.log("Selected text:", selectedText);

    if (!selectedText) {
      return {
        isEditable: false,
        reason: "No text selected",
      };
    }

    // Try to modify the text to check if it's editable
    return await tryModifyText(selectedText);

  } catch (error) {
    console.error("Error validating text:", error);
    return {
      isEditable: false,
      reason: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
