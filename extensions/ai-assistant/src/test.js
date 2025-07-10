"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const api_1 = require("@raycast/api");
const text_validator_1 = require("./utils/text-validator");
/**
 * Command to test if selected text is editable
 */
async function Command() {
    try {
        const result = await (0, text_validator_1.validateSelectedText)();
        console.log("Validation result:", result);
        const message = result.isEditable
            ? "✅ Texte éditable"
            : `❌ Pas éditable${result.reason ? ` (${result.reason})` : ""}`;
        await (0, api_1.showHUD)(message);
    }
    catch (error) {
        console.error("Error in test command:", error);
        await (0, api_1.showHUD)("❌ Erreur lors du test");
    }
}
