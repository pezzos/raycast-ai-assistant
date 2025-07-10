"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureTime = measureTime;
exports.measureTimeAdvanced = measureTimeAdvanced;
exports.startPeriodicNotification = startPeriodicNotification;
exports.stopPeriodicNotification = stopPeriodicNotification;
const api_1 = require("@raycast/api");
const performance_profiler_1 = require("./performance-profiler");
/**
 * Measures the execution time of an async function and logs it
 * Enhanced version with performance profiling integration
 * @param name Name of the operation being timed
 * @param fn Function to execute and time
 * @param metadata Optional metadata for profiling
 * @returns Result of the function execution
 */
async function measureTime(name, fn, metadata) {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        // Enhanced logging with metadata summary
        const metadataStr = metadata
            ? ` [${Object.entries(metadata)
                .filter(([key, value]) => key !== "systemInfo" && value !== undefined)
                .map(([key, value]) => `${key}=${value}`)
                .join(", ")}]`
            : "";
        console.log(`⏱️ ${name} took ${duration}ms${metadataStr}`);
        // Log vers le profiler avancé aussi
        await performance_profiler_1.performanceProfiler.measureOperation(name, async () => result, metadata);
        return result;
    }
    catch (error) {
        const duration = Date.now() - start;
        console.log(`❌ ${name} failed after ${duration}ms:`, error);
        // Log l'erreur vers le profiler
        try {
            await performance_profiler_1.performanceProfiler.measureOperation(name, async () => {
                throw error;
            }, metadata);
        }
        catch {
            // Ignore l'erreur du profiler
        }
        throw error;
    }
}
/**
 * Version simplifiée qui utilise directement le profiler avancé
 * @param name Name of the operation being timed
 * @param fn Function to execute and time
 * @param metadata Optional metadata for profiling
 * @returns Result of the function execution
 */
async function measureTimeAdvanced(name, fn, metadata) {
    return performance_profiler_1.performanceProfiler.measureOperation(name, fn, metadata);
}
let notificationInterval = null;
/**
 * Starts periodic notifications during a long-running process
 * @param message Base message to show
 * @param intervalMs Interval between notifications in milliseconds
 */
function startPeriodicNotification(message, intervalMs = 1000) {
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }
    let count = 0;
    notificationInterval = setInterval(() => {
        count++;
        (0, api_1.showHUD)(`${message} ${".".repeat(count % 4)}`);
    }, intervalMs);
}
/**
 * Stops the periodic notifications
 */
function stopPeriodicNotification() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}
