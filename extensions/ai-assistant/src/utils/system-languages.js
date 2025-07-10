"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemLanguage = getSystemLanguage;
exports.getKeyboardLanguage = getKeyboardLanguage;
exports.getTimezoneLanguage = getTimezoneLanguage;
exports.getSystemLanguages = getSystemLanguages;
const child_process_1 = require("child_process");
// Get the system language from environment
function getSystemLanguage() {
    return "en";
}
// Get keyboard layout language using system commands
function getKeyboardLanguage() {
    try {
        const layout = (0, child_process_1.execSync)("defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources | grep -w 'KeyboardLayout Name' | cut -d'\"' -f4")
            .toString()
            .trim();
        // Map common keyboard layouts to language codes
        const layoutMap = {
            French: "fr",
            "French - Numerical": "fr",
            ABC: "en",
            US: "en",
            British: "en",
            German: "de",
            Spanish: "es",
            Italian: "it",
            // Add more mappings as needed
        };
        return layoutMap[layout] || "en";
    }
    catch {
        return "en";
    }
}
// Get timezone-based language guess
function getTimezoneLanguage() {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Map common timezones to likely languages
        const timezoneMap = {
            "Europe/Paris": "fr",
            "Europe/London": "en",
            "Europe/Berlin": "de",
            "Europe/Madrid": "es",
            "Europe/Rome": "it",
            // Add more mappings as needed
        };
        return timezoneMap[timezone] || "en";
    }
    catch {
        return "en";
    }
}
// Get the two most likely system languages
function getSystemLanguages() {
    const systemLang = getSystemLanguage();
    const keyboardLang = getKeyboardLanguage();
    const timezoneLang = getTimezoneLanguage();
    // If system language matches keyboard or timezone, use the other as secondary
    if (systemLang === keyboardLang) {
        return [systemLang, timezoneLang];
    }
    else if (systemLang === timezoneLang) {
        return [systemLang, keyboardLang];
    }
    else {
        // Otherwise use system language and keyboard language
        return [systemLang, keyboardLang];
    }
}
