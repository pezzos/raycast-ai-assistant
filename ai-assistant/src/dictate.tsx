import { showHUD, getPreferenceValues, LocalStorage, Clipboard } from "@raycast/api";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { DICTATE_TARGET_LANG_KEY } from "./dictate-settings";

const execAsync = promisify(exec);
const SOX_PATH = "/opt/homebrew/bin/sox";

interface Preferences {
  openaiApiKey: string;
  primaryLang: string;
}

export default async function Command() {
  console.log("Starting dictation command...");

  // Vérifier que sox est installé
  if (!fs.existsSync(SOX_PATH)) {
    console.error(`Sox not found at path: ${SOX_PATH}`);
    await showHUD("🎙️ Sox not found - Please install it with: brew install sox");
    return;
  }

  try {
    const preferences = getPreferenceValues<Preferences>();
    const targetLanguage = await LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY) || "auto";
    console.log("Target language:", targetLanguage);

    const openai = new OpenAI({
      apiKey: preferences.openaiApiKey,
    });

    // Préparer le fichier temporaire
    const tempDir = path.join(process.env.TMPDIR || "/tmp", "raycast-dictate");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const outputPath = path.join(tempDir, `recording-${Date.now()}.wav`);
    console.log("Recording will be saved to:", outputPath);

    // Démarrer l'enregistrement
    await showHUD("🎙️ Recording... (will stop after 2s of silence)");
    console.log("Starting recording...");

    const command = `
      export PATH="/opt/homebrew/bin:$PATH";
      "${SOX_PATH}" -d "${outputPath}" silence 1 0.1 2% 1 2.0 2%
    `;

    await execAsync(command, { shell: "/bin/zsh" });
    console.log("Recording completed");

    // Traiter l'audio
    await showHUD("🔄 Converting speech to text...");
    console.log("Processing audio file:", outputPath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(outputPath),
      model: "whisper-1",
      response_format: "text",
      language: targetLanguage === "auto" ? undefined : targetLanguage,
    });
    console.log("Transcription received:", transcription);

    // Nettoyer le fichier temporaire
    fs.unlinkSync(outputPath);
    console.log("Temporary file cleaned up");

    // Traduire si nécessaire
    if (targetLanguage !== "auto") {
      await showHUD(`🌐 Translating to ${targetLanguage}...`);
      console.log("Translating to:", targetLanguage);

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the following text to the specified language: ${targetLanguage}. Keep the tone and style of the original text.`,
          },
          {
            role: "user",
            content: transcription,
          },
        ],
        temperature: 0.3,
      });

      const translatedText = completion.choices[0].message.content || "";
      if (translatedText) {
        await Clipboard.paste(translatedText);
        await showHUD("✅ Translation completed and pasted!");
        console.log("Translation pasted:", translatedText);
      }
    } else {
      await Clipboard.paste(transcription);
      await showHUD("✅ Transcription completed and pasted!");
      console.log("Transcription pasted:", transcription);
    }
  } catch (error) {
    console.error("Error:", error);
    await showHUD("❌ Error: " + (error instanceof Error ? error.message : "An error occurred"));
  } finally {
    // Nettoyage final
    try {
      await execAsync("pkill sox");
    } catch (error) {
      // Ignore pkill errors
    }
  }
}

