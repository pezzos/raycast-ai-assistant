"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("openai"));
const api_1 = require("@raycast/api");
const settings_manager_1 = __importDefault(require("./settings-manager"));
class OpenAIClientManager {
    static instance = null;
    static apiKey = null;
    static async getClient() {
        const settings = await settings_manager_1.default.loadAllSettings();
        const currentApiKey = settings.openaiApiKey;
        // If we have a client and the API key hasn't changed, return it
        if (this.instance && this.apiKey === currentApiKey) {
            return this.instance;
        }
        // If no API key in settings, try preferences
        let apiKey = currentApiKey;
        if (!apiKey) {
            try {
                const preferences = (0, api_1.getPreferenceValues)();
                apiKey = preferences.openaiApiKey;
            }
            catch (error) {
                console.error("Error getting preferences:", error);
            }
        }
        if (!apiKey) {
            throw new Error("OpenAI API key not found in settings or preferences");
        }
        // Create new client
        this.instance = new openai_1.default({ apiKey });
        this.apiKey = apiKey;
        return this.instance;
    }
    static clearClient() {
        this.instance = null;
        this.apiKey = null;
    }
}
exports.default = OpenAIClientManager;
