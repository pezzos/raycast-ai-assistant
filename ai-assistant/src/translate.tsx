import {
  showHUD,
  getPreferenceValues,
  Detail,
  getSelectedText as raycastGetSelectedText,
  Clipboard,
} from "@raycast/api";
import OpenAI from "openai";
import { getLLMModel } from "./utils/common";
import { execSync } from "child_process";

// Debug logging function
function log(message: string, data?: unknown) {
  if (data && typeof data === "object") {
    // Mask sensitive data
    const maskedData = JSON.parse(JSON.stringify(data));
    if ("openaiApiKey" in maskedData) {
      maskedData.openaiApiKey = "********";
    }
    console.log(`[Translate] ${message}`, JSON.stringify(maskedData, null, 2));
  } else {
    console.log(`[Translate] ${message}`, data || "");
  }
}

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
  secondaryLang: string;
  fixText: boolean;
}

interface SelectionResult {
  text: string;
  application?: {
    name: string;
    bundleId: string;
  };
}

// Initialize OpenAI client
let openai: OpenAI;

// Cache for translations
const translationCache = new Map<string, string>();

/**
 * Try to check if text is editable using AppleScript
 * @param text The text to check
 * @returns Promise<boolean> True if the text is editable
 */
async function checkEditableWithAppleScript(text: string): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        set frontmost of first process whose frontmost is true to true
        set origClip to get the clipboard
        set the clipboard to "${text.replace(/"/g, '\\"')}"
        delay 0.1
        keystroke "v" using command down
        delay 0.1
        set the clipboard to origClip
        return true
      end tell`;

    const result = execSync(`osascript -e '${script}'`).toString().trim();
    log("AppleScript check result", { result });
    return result === "true";
  } catch (error) {
    log("AppleScript check failed", { error: error instanceof Error ? error.message : "Unknown error" });
    return false;
  }
}

/**
 * Try to check if text is editable using DOM for browsers
 * @returns Promise<boolean> True if the text is editable
 */
async function checkEditableWithDOM(): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        set frontApp to name of first process whose frontmost is true
        if frontApp is in {"Safari", "Google Chrome", "Arc", "Firefox", "Microsoft Edge", "Opera", "Brave Browser"} then
          tell application frontApp
            try
              tell front window
                tell current tab
                  execute javascript "
                    (function() {
                      try {
                        const selection = window.getSelection();
                        if (!selection.rangeCount) return 'false';
                        const range = selection.getRangeAt(0);
                        const element = range.startContainer.parentElement;
                        let current = element;
                        while (current && current !== document.body) {
                          if (current.isContentEditable || current.tagName === 'INPUT' || current.tagName === 'TEXTAREA') {
                            return 'true';
                          }
                          current = current.parentElement;
                        }
                        return 'false';
                      } catch (e) {
                        return 'false';
                      }
                    })()
                  "
                end tell
              end tell
            on error
              return "false"
            end try
          end tell
        end if
        return "false"
      end tell`;

    const result = execSync(`osascript -e '${script}'`).toString().trim();
    log("DOM editable check result", { result });
    return result === "true";
  } catch (error) {
    log("DOM check failed", { error: error instanceof Error ? error.message : "Unknown error" });
    return false;
  }
}

/**
 * Try to replace selected text and verify if it worked
 * @param text Text to replace with
 * @returns Promise<boolean> True if the replacement worked
 */
async function tryReplaceSelectedText(text: string): Promise<boolean> {
  try {
    // Sauvegarde du presse-papier
    const originalClipboard = await Clipboard.read();

    // Copie du texte dans le presse-papier
    await Clipboard.copy(text);

    // Simulation de Cmd+V
    const pasteScript = `
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;
    execSync(`osascript -e '${pasteScript}'`);

    // Restauration du presse-papier
    await Clipboard.copy(originalClipboard.text || "");

    return true;
  } catch (error) {
    log("Replace text failed", { error: error instanceof Error ? error.message : "Unknown error" });
    return false;
  }
}

/**
 * Get the selected text and check if it's editable using multiple methods
 * @returns Promise<{text: string, isEditable: boolean}> The selected text and whether it's editable
 */
async function getSelectedTextAndEditableStatus(): Promise<{ text: string; isEditable: boolean }> {
  try {
    const result = await raycastGetSelectedText();
    log("Raw getSelectedText result", {
      type: typeof result,
      isString: typeof result === "string",
      isObject: typeof result === "object",
      hasApplication: typeof result === "object" && result !== null && "application" in result,
      value: result,
    });

    // If result is a string, we need to do additional checks
    if (typeof result === "string") {
      const text = result;

      // Try DOM check first for web browsers
      const isDOMEditable = await checkEditableWithDOM();
      log("DOM editable check", { isDOMEditable });

      // If DOM check is inconclusive, try AppleScript check
      if (!isDOMEditable) {
        const isEditableScript = await checkEditableWithAppleScript(text);
        log("AppleScript editable check", { isEditableScript });
        return { text, isEditable: isEditableScript };
      }

      return { text, isEditable: isDOMEditable };
    }

    // If result is an object with application info
    if (typeof result === "object" && result !== null) {
      const selectionResult = result as SelectionResult;
      if ("text" in selectionResult) {
        log("Selection from application", {
          appName: selectionResult.application?.name,
          bundleId: selectionResult.application?.bundleId,
        });

        // Liste réduite aux applications vraiment en lecture seule
        const readOnlyApps = ["Preview", "Books", "QuickLook", "Finder", "Photos"];

        const isReadOnlyApp = selectionResult.application && readOnlyApps.includes(selectionResult.application.name);

        // Si ce n'est pas une app en lecture seule, on fait des vérifications supplémentaires
        if (!isReadOnlyApp) {
          const isDOMEditable = await checkEditableWithDOM();
          if (isDOMEditable) {
            return { text: selectionResult.text, isEditable: true };
          }

          const isEditableScript = await checkEditableWithAppleScript(selectionResult.text);
          return { text: selectionResult.text, isEditable: isEditableScript };
        }

        return {
          text: selectionResult.text,
          isEditable: false,
        };
      }
    }

    throw new Error("Invalid selection result");
  } catch (error) {
    console.error("Error getting selected text:", error);
    throw new Error("No text selected");
  }
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    log("Starting translation with preferences", {
      primaryLang: preferences.primaryLang,
      secondaryLang: preferences.secondaryLang,
      fixText: preferences.fixText,
    });

    // Initialize OpenAI client
    if (!openai) {
      if (!preferences.openaiApiKey) {
        throw new Error("OpenAI API key is not set in preferences");
      }
      openai = new OpenAI({
        apiKey: preferences.openaiApiKey,
      });
      log("OpenAI client initialized");
    }

    // Get selected text and editable status
    const { text: selectedText, isEditable } = await getSelectedTextAndEditableStatus();
    log("Selected text", { length: selectedText?.length, isEditable });

    if (!selectedText || selectedText.trim().length === 0) {
      await showHUD("❌ No text selected");
      return null;
    }

    // Show progress
    await showHUD("🌐 Translating...");

    // Create the translation prompt
    const prompt = `Translate this text between ${preferences.primaryLang} and ${preferences.secondaryLang}:
"${selectedText}"

Rules:
- First detect the source language between ${preferences.primaryLang}, ${preferences.secondaryLang}
- Translate to the other language
- If the source language is not ${preferences.primaryLang} or ${preferences.secondaryLang}, translate to ${preferences.primaryLang}
- Keep formatting and punctuation
- Preserve special characters and technical terms
- Match the original tone${preferences.fixText ? "\n- Fix any grammar, punctuation and spelling issues" : ""}

Respond ONLY with the translation, no explanations or language detection info.`;

    // Check cache
    const cacheKey = `${selectedText}_${preferences.primaryLang}_${preferences.secondaryLang}`;
    const cachedTranslation = translationCache.get(cacheKey);

    let translatedText: string;
    if (cachedTranslation) {
      log("Using cached translation");
      translatedText = cachedTranslation;
    } else {
      // Call OpenAI API for translation
      log("Calling OpenAI API for translation");
      const completion = await openai.chat.completions.create({
        model: getLLMModel(),
        messages: [
          {
            role: "system",
            content:
              "You are a translation assistant. Respond ONLY with the translated text, without any additional text, quotes, or explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      translatedText = completion.choices[0].message.content || "";
      log("Received translation", { length: translatedText?.length });

      if (!translatedText) {
        throw new Error("No translation received");
      }

      // Cache the result
      translationCache.set(cacheKey, translatedText);
      log("Translation cached");
    }

    // Clean the translation
    const cleanTranslation = translatedText
      .replace(/^["']|["']$/g, "")
      .replace(/\n*Translation:.*$/gs, "")
      .trim();

    if (isEditable) {
      // Try to replace the text and verify if it worked
      log("Trying to replace selected text");
      const replacementWorked = await tryReplaceSelectedText(cleanTranslation);

      if (replacementWorked) {
        await showHUD("✅ Translation completed");
        return null;
      }
    }

    // If not editable or replacement failed, show in Detail view
    log("Showing in Detail view");
    return (
      <Detail
        markdown={`# Translation

## Original Text
${selectedText}

## Translated Text
${cleanTranslation}

---
From: ${preferences.primaryLang} ↔️ ${preferences.secondaryLang}`}
      />
    );
  } catch (error) {
    log("Error during translation", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await showHUD("❌ Error: " + errorMessage);

    // Ne retourne pas de vue Detail en cas d'erreur de sélection de texte
    if (error instanceof Error && error.message === "No text selected") {
      return null;
    }

    // Retourne une vue Detail uniquement pour les autres types d'erreurs
    return <Detail markdown={`# Error\n\n${errorMessage}`} />;
  }
}
