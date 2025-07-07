import OpenAI from "openai";
import { getPreferenceValues } from "@raycast/api";
import SettingsManager from "./settings-manager";

interface Preferences {
  openaiApiKey: string;
}

class OpenAIClientManager {
  private static instance: OpenAI | null = null;
  private static apiKey: string | null = null;

  static async getClient(): Promise<OpenAI> {
    const settings = await SettingsManager.loadAllSettings();
    const currentApiKey = settings.openaiApiKey;

    // If we have a client and the API key hasn't changed, return it
    if (this.instance && this.apiKey === currentApiKey) {
      return this.instance;
    }

    // If no API key in settings, try preferences
    let apiKey = currentApiKey;
    if (!apiKey) {
      try {
        const preferences = getPreferenceValues<Preferences>();
        apiKey = preferences.openaiApiKey;
      } catch (error) {
        console.error("Error getting preferences:", error);
      }
    }

    if (!apiKey) {
      throw new Error("OpenAI API key not found in settings or preferences");
    }

    // Create new client
    this.instance = new OpenAI({ apiKey });
    this.apiKey = apiKey;

    return this.instance;
  }

  static clearClient(): void {
    this.instance = null;
    this.apiKey = null;
  }
}

export default OpenAIClientManager;
