"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@raycast/api");
const settings_1 = require("../settings");
const local_models_1 = require("./local-models");
class SettingsManager {
    static cache = new Map();
    static loaded = false;
    static SETTINGS_KEYS = [
        settings_1.PRIMARY_LANG_KEY,
        settings_1.SECONDARY_LANG_KEY,
        settings_1.LLM_MODEL_KEY,
        settings_1.WHISPER_MODEL_KEY,
        settings_1.DICTATE_TARGET_LANG_KEY,
        settings_1.WHISPER_MODE_KEY,
        settings_1.TRANSCRIBE_MODEL_KEY,
        settings_1.SILENCE_TIMEOUT_KEY,
        settings_1.USE_PERSONAL_DICTIONARY_KEY,
        settings_1.MUTE_DURING_DICTATION_KEY,
        settings_1.FIX_TEXT_KEY,
        settings_1.EXPERIMENTAL_MODE_KEY,
    ];
    static DEFAULT_VALUES = {
        [settings_1.PRIMARY_LANG_KEY]: "en",
        [settings_1.SECONDARY_LANG_KEY]: "fr",
        [settings_1.LLM_MODEL_KEY]: "gpt-4o-mini",
        [settings_1.WHISPER_MODEL_KEY]: "base",
        [settings_1.DICTATE_TARGET_LANG_KEY]: "auto",
        [settings_1.WHISPER_MODE_KEY]: "transcribe",
        [settings_1.TRANSCRIBE_MODEL_KEY]: "gpt-4o-mini-transcribe",
        [settings_1.SILENCE_TIMEOUT_KEY]: "2.0",
        [settings_1.USE_PERSONAL_DICTIONARY_KEY]: false,
        [settings_1.MUTE_DURING_DICTATION_KEY]: true,
        [settings_1.FIX_TEXT_KEY]: false,
        [settings_1.EXPERIMENTAL_MODE_KEY]: false,
    };
    static async loadAllSettings() {
        if (this.loaded) {
            return this.getCachedSettings();
        }
        try {
            const values = await Promise.all(this.SETTINGS_KEYS.map((key) => api_1.LocalStorage.getItem(key)));
            this.SETTINGS_KEYS.forEach((key, index) => {
                const value = values[index];
                this.cache.set(key, value !== undefined ? value : this.DEFAULT_VALUES[key]);
            });
            this.loaded = true;
            return this.getCachedSettings();
        }
        catch (error) {
            console.error("Error loading settings:", error);
            return this.getDefaultSettings();
        }
    }
    static get(key) {
        if (!this.loaded) {
            console.warn("Settings not loaded yet. Use loadAllSettings() first.");
            return this.DEFAULT_VALUES[key];
        }
        return this.cache.get(key) ?? this.DEFAULT_VALUES[key];
    }
    static async set(key, value) {
        this.cache.set(key, value);
        await api_1.LocalStorage.setItem(key, value);
        // Clear model cache when model-related settings change
        const modelRelatedKeys = [settings_1.WHISPER_MODEL_KEY, settings_1.WHISPER_MODE_KEY, settings_1.TRANSCRIBE_MODEL_KEY];
        if (modelRelatedKeys.includes(key)) {
            (0, local_models_1.clearModelCache)();
        }
    }
    static clearCache() {
        this.cache.clear();
        this.loaded = false;
    }
    static getCachedSettings() {
        return {
            primaryLanguage: this.get(settings_1.PRIMARY_LANG_KEY),
            secondaryLanguage: this.get(settings_1.SECONDARY_LANG_KEY),
            llmModel: this.get(settings_1.LLM_MODEL_KEY),
            whisperModel: this.get(settings_1.WHISPER_MODEL_KEY),
            dictateTargetLanguage: this.get(settings_1.DICTATE_TARGET_LANG_KEY),
            whisperMode: this.get(settings_1.WHISPER_MODE_KEY),
            transcribeModel: this.get(settings_1.TRANSCRIBE_MODEL_KEY),
            silenceTimeout: this.get(settings_1.SILENCE_TIMEOUT_KEY),
            usePersonalDictionary: this.get(settings_1.USE_PERSONAL_DICTIONARY_KEY),
            muteDuringDictation: this.get(settings_1.MUTE_DURING_DICTATION_KEY),
            fixText: this.get(settings_1.FIX_TEXT_KEY),
            experimentalMode: this.get(settings_1.EXPERIMENTAL_MODE_KEY),
        };
    }
    static getDefaultSettings() {
        return {
            primaryLanguage: this.DEFAULT_VALUES[settings_1.PRIMARY_LANG_KEY],
            secondaryLanguage: this.DEFAULT_VALUES[settings_1.SECONDARY_LANG_KEY],
            llmModel: this.DEFAULT_VALUES[settings_1.LLM_MODEL_KEY],
            whisperModel: this.DEFAULT_VALUES[settings_1.WHISPER_MODEL_KEY],
            dictateTargetLanguage: this.DEFAULT_VALUES[settings_1.DICTATE_TARGET_LANG_KEY],
            whisperMode: this.DEFAULT_VALUES[settings_1.WHISPER_MODE_KEY],
            transcribeModel: this.DEFAULT_VALUES[settings_1.TRANSCRIBE_MODEL_KEY],
            silenceTimeout: this.DEFAULT_VALUES[settings_1.SILENCE_TIMEOUT_KEY],
            usePersonalDictionary: this.DEFAULT_VALUES[settings_1.USE_PERSONAL_DICTIONARY_KEY],
            muteDuringDictation: this.DEFAULT_VALUES[settings_1.MUTE_DURING_DICTATION_KEY],
            fixText: this.DEFAULT_VALUES[settings_1.FIX_TEXT_KEY],
            experimentalMode: this.DEFAULT_VALUES[settings_1.EXPERIMENTAL_MODE_KEY],
        };
    }
}
exports.default = SettingsManager;
