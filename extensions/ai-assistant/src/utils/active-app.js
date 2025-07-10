"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveApplication = getActiveApplication;
const api_1 = require("@raycast/api");
/**
 * Gets the name of the currently active application
 * @returns The name of the active application or undefined if not found
 */
async function getActiveApplication() {
    try {
        // Try to get selected text to determine active app
        const result = await (0, api_1.getSelectedText)();
        if (typeof result === "object" && "application" in result) {
            return result.application.name;
        }
    }
    catch {
        // Fallback: get all applications and find the frontmost one
        const apps = await (0, api_1.getApplications)();
        const frontmostApp = apps.find((app) => app.name === apps[0].name);
        return frontmostApp?.name;
    }
    return undefined;
}
