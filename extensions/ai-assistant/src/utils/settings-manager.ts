import { LocalStorage } from "@raycast/api";
import {
  PRIMARY_LANG_KEY,
  SECONDARY_LANG_KEY,
  LLM_MODEL_KEY,
  WHISPER_MODEL_KEY,
  DICTATE_TARGET_LANG_KEY,
  WHISPER_MODE_KEY,
  TRANSCRIBE_MODEL_KEY,
  SILENCE_TIMEOUT_KEY,
  USE_PERSONAL_DICTIONARY_KEY,
  MUTE_DURING_DICTATION_KEY,
  FIX_TEXT_KEY,
  EXPERIMENTAL_MODE_KEY,
} from "../settings";
import { clearModelCache } from "./local-models";

export interface AllSettings {
  primaryLanguage: string;
  secondaryLanguage: string;
  llmModel: string;
  whisperModel: string;
  dictateTargetLanguage: string;
  whisperMode: string;
  transcribeModel: string;
  silenceTimeout: string;
  usePersonalDictionary: boolean;
  muteDuringDictation: boolean;
  fixText: boolean;
  experimentalMode: boolean;
}

class SettingsManager {
  private static cache: Map<string, any> = new Map();
  private static loaded = false;

  private static readonly SETTINGS_KEYS = [
    PRIMARY_LANG_KEY,
    SECONDARY_LANG_KEY,
    LLM_MODEL_KEY,
    WHISPER_MODEL_KEY,
    DICTATE_TARGET_LANG_KEY,
    WHISPER_MODE_KEY,
    TRANSCRIBE_MODEL_KEY,
    SILENCE_TIMEOUT_KEY,
    USE_PERSONAL_DICTIONARY_KEY,
    MUTE_DURING_DICTATION_KEY,
    FIX_TEXT_KEY,
    EXPERIMENTAL_MODE_KEY,
  ];

  private static readonly DEFAULT_VALUES: Record<string, any> = {
    [PRIMARY_LANG_KEY]: "en",
    [SECONDARY_LANG_KEY]: "fr",
    [LLM_MODEL_KEY]: "gpt-4o-mini",
    [WHISPER_MODEL_KEY]: "base",
    [DICTATE_TARGET_LANG_KEY]: "auto",
    [WHISPER_MODE_KEY]: "transcribe",
    [TRANSCRIBE_MODEL_KEY]: "gpt-4o-mini-transcribe",
    [SILENCE_TIMEOUT_KEY]: "2.0",
    [USE_PERSONAL_DICTIONARY_KEY]: false,
    [MUTE_DURING_DICTATION_KEY]: true,
    [FIX_TEXT_KEY]: false,
    [EXPERIMENTAL_MODE_KEY]: false,
  };

  static async loadAllSettings(): Promise<AllSettings> {
    if (this.loaded) {
      return this.getCachedSettings();
    }

    try {
      const values = await Promise.all(this.SETTINGS_KEYS.map((key) => LocalStorage.getItem(key)));

      this.SETTINGS_KEYS.forEach((key, index) => {
        const value = values[index];
        this.cache.set(key, value !== undefined ? value : this.DEFAULT_VALUES[key]);
      });

      this.loaded = true;
      return this.getCachedSettings();
    } catch (error) {
      console.error("Error loading settings:", error);
      return this.getDefaultSettings();
    }
  }

  static get(key: string): any {
    if (!this.loaded) {
      console.warn("Settings not loaded yet. Use loadAllSettings() first.");
      return this.DEFAULT_VALUES[key];
    }
    return this.cache.get(key) ?? this.DEFAULT_VALUES[key];
  }

  static async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
    await LocalStorage.setItem(key, value);

    // Clear model cache when model-related settings change
    const modelRelatedKeys = [WHISPER_MODEL_KEY, WHISPER_MODE_KEY, TRANSCRIBE_MODEL_KEY];
    if (modelRelatedKeys.includes(key)) {
      clearModelCache();
    }
  }

  static clearCache(): void {
    this.cache.clear();
    this.loaded = false;
  }

  private static getCachedSettings(): AllSettings {
    return {
      primaryLanguage: this.get(PRIMARY_LANG_KEY),
      secondaryLanguage: this.get(SECONDARY_LANG_KEY),
      llmModel: this.get(LLM_MODEL_KEY),
      whisperModel: this.get(WHISPER_MODEL_KEY),
      dictateTargetLanguage: this.get(DICTATE_TARGET_LANG_KEY),
      whisperMode: this.get(WHISPER_MODE_KEY),
      transcribeModel: this.get(TRANSCRIBE_MODEL_KEY),
      silenceTimeout: this.get(SILENCE_TIMEOUT_KEY),
      usePersonalDictionary: this.get(USE_PERSONAL_DICTIONARY_KEY),
      muteDuringDictation: this.get(MUTE_DURING_DICTATION_KEY),
      fixText: this.get(FIX_TEXT_KEY),
      experimentalMode: this.get(EXPERIMENTAL_MODE_KEY),
    };
  }

  private static getDefaultSettings(): AllSettings {
    return {
      primaryLanguage: this.DEFAULT_VALUES[PRIMARY_LANG_KEY],
      secondaryLanguage: this.DEFAULT_VALUES[SECONDARY_LANG_KEY],
      llmModel: this.DEFAULT_VALUES[LLM_MODEL_KEY],
      whisperModel: this.DEFAULT_VALUES[WHISPER_MODEL_KEY],
      dictateTargetLanguage: this.DEFAULT_VALUES[DICTATE_TARGET_LANG_KEY],
      whisperMode: this.DEFAULT_VALUES[WHISPER_MODE_KEY],
      transcribeModel: this.DEFAULT_VALUES[TRANSCRIBE_MODEL_KEY],
      silenceTimeout: this.DEFAULT_VALUES[SILENCE_TIMEOUT_KEY],
      usePersonalDictionary: this.DEFAULT_VALUES[USE_PERSONAL_DICTIONARY_KEY],
      muteDuringDictation: this.DEFAULT_VALUES[MUTE_DURING_DICTATION_KEY],
      fixText: this.DEFAULT_VALUES[FIX_TEXT_KEY],
      experimentalMode: this.DEFAULT_VALUES[EXPERIMENTAL_MODE_KEY],
    };
  }
}

export default SettingsManager;
