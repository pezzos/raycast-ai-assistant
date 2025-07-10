"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceComparator = void 0;
exports.recordPerformanceSnapshot = recordPerformanceSnapshot;
const performance_profiler_1 = require("./performance-profiler");
class PerformanceComparator {
    static instance;
    snapshots = [];
    MAX_SNAPSHOTS = 50;
    constructor() { }
    static getInstance() {
        if (!PerformanceComparator.instance) {
            PerformanceComparator.instance = new PerformanceComparator();
        }
        return PerformanceComparator.instance;
    }
    /**
     * Records a performance snapshot for comparison
     */
    recordSnapshot(snapshot) {
        this.snapshots.push(snapshot);
        // Keep only the most recent snapshots
        if (this.snapshots.length > this.MAX_SNAPSHOTS) {
            this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
        }
        // Enhanced logging with comparison
        const mode = snapshot.mode === "unified" ? "🧪 UNIFIED" : "🔄 LEGACY";
        const operations = snapshot.operations
            .filter((op) => op.success)
            .map((op) => `${op.name}:${op.duration}ms`)
            .join(", ");
        console.log(`📊 [PERF] ${mode} - Total: ${snapshot.totalDuration}ms | ${operations}`);
        // Show comparison if we have both modes
        this.showComparison();
    }
    /**
     * Creates a snapshot from the current performance profiler session
     */
    async createSnapshotFromSession(mode) {
        try {
            const stats = await performance_profiler_1.performanceProfiler.getPerformanceStats("dictate", 1);
            if (stats.sessions.length === 0) {
                return null;
            }
            const latestSession = stats.sessions[stats.sessions.length - 1];
            return {
                timestamp: latestSession.startTime,
                mode,
                totalDuration: latestSession.totalDuration || 0,
                operations: latestSession.metrics.map((metric) => ({
                    name: metric.operation,
                    duration: metric.duration,
                    success: metric.success,
                })),
                metadata: {
                    model: latestSession.metrics.find((m) => m.metadata?.model)?.metadata?.model,
                    language: latestSession.metrics.find((m) => m.metadata?.language)?.metadata?.language,
                    dictionaryEntries: latestSession.metrics.find((m) => m.metadata?.dictionaryEntries)?.metadata
                        ?.dictionaryEntries,
                    fixText: latestSession.metrics.find((m) => m.metadata?.fixText)?.metadata?.fixText,
                    targetLanguage: latestSession.metrics.find((m) => m.metadata?.targetLanguage)?.metadata
                        ?.targetLanguage,
                    apiCalls: latestSession.metrics.find((m) => m.metadata?.apiCalls)?.metadata?.apiCalls,
                },
            };
        }
        catch (error) {
            console.error("Failed to create performance snapshot:", error);
            return null;
        }
    }
    /**
     * Compares performance between legacy and unified modes
     */
    showComparison() {
        const recentSnapshots = this.snapshots.slice(-10); // Last 10 snapshots
        const legacySnapshots = recentSnapshots.filter((s) => s.mode === "legacy");
        const unifiedSnapshots = recentSnapshots.filter((s) => s.mode === "unified");
        if (legacySnapshots.length === 0 || unifiedSnapshots.length === 0) {
            return; // Not enough data for comparison
        }
        // Calculate averages
        const avgLegacy = legacySnapshots.reduce((sum, s) => sum + s.totalDuration, 0) / legacySnapshots.length;
        const avgUnified = unifiedSnapshots.reduce((sum, s) => sum + s.totalDuration, 0) / unifiedSnapshots.length;
        const timeSaved = avgLegacy - avgUnified;
        const percentageImprovement = (timeSaved / avgLegacy) * 100;
        // Count API calls (estimate based on operations)
        const avgLegacyApiCalls = this.estimateApiCalls(legacySnapshots);
        const avgUnifiedApiCalls = this.estimateApiCalls(unifiedSnapshots);
        if (Math.abs(percentageImprovement) > 5) {
            // Only show if significant difference
            const improvementIcon = percentageImprovement > 0 ? "⚡" : "⚠️";
            console.log(`${improvementIcon} [COMPARISON] Unified vs Legacy: ${timeSaved > 0 ? "+" : ""}${timeSaved.toFixed(0)}ms (${percentageImprovement.toFixed(1)}%) | API calls: ${avgUnifiedApiCalls} vs ${avgLegacyApiCalls}`);
        }
    }
    /**
     * Estimates API calls based on operations in snapshots
     */
    estimateApiCalls(snapshots) {
        if (snapshots.length === 0)
            return 0;
        const avgApiCalls = snapshots.reduce((sum, snapshot) => {
            // Count operations that likely represent API calls
            const apiCallOperations = snapshot.operations.filter((op) => op.name.includes("transcription") ||
                op.name.includes("processing") ||
                op.name.includes("enhanced") ||
                op.name.includes("unified"));
            // Legacy typically has: transcription + post-processing (2 calls)
            // Unified typically has: unified-transcription (1 call)
            const estimatedCalls = snapshot.mode === "legacy" ? Math.max(2, apiCallOperations.length) : Math.max(1, apiCallOperations.length);
            return sum + estimatedCalls;
        }, 0);
        return Math.round(avgApiCalls / snapshots.length);
    }
    /**
     * Generates a detailed performance report
     */
    getDetailedReport() {
        const recentSnapshots = this.snapshots.slice(-20);
        const legacySnapshots = recentSnapshots.filter((s) => s.mode === "legacy");
        const unifiedSnapshots = recentSnapshots.filter((s) => s.mode === "unified");
        let comparison = null;
        if (legacySnapshots.length > 0 && unifiedSnapshots.length > 0) {
            const avgLegacy = legacySnapshots.reduce((sum, s) => sum + s.totalDuration, 0) / legacySnapshots.length;
            const avgUnified = unifiedSnapshots.reduce((sum, s) => sum + s.totalDuration, 0) / unifiedSnapshots.length;
            const avgLegacyApiCalls = this.estimateApiCalls(legacySnapshots);
            const avgUnifiedApiCalls = this.estimateApiCalls(unifiedSnapshots);
            const timeSaved = avgLegacy - avgUnified;
            const percentageImprovement = (timeSaved / avgLegacy) * 100;
            comparison = {
                legacy: {
                    totalTime: avgLegacy,
                    transcriptionTime: avgLegacy * 0.4, // Estimated
                    postProcessingTime: avgLegacy * 0.6, // Estimated
                    apiCalls: avgLegacyApiCalls,
                },
                unified: {
                    totalTime: avgUnified,
                    apiCalls: avgUnifiedApiCalls,
                },
                improvement: {
                    timeSaved,
                    percentageImprovement,
                    apiCallsReduced: avgLegacyApiCalls - avgUnifiedApiCalls,
                },
            };
        }
        const summary = `Performance Report: ${recentSnapshots.length} recent operations (${legacySnapshots.length} legacy, ${unifiedSnapshots.length} unified)`;
        return {
            summary,
            comparison,
            recentSnapshots,
        };
    }
    /**
     * Clears all recorded snapshots
     */
    clearSnapshots() {
        this.snapshots = [];
        console.log("📊 Performance snapshots cleared");
    }
}
// Export singleton instance
exports.performanceComparator = PerformanceComparator.getInstance();
/**
 * Convenience function to record a performance snapshot
 */
async function recordPerformanceSnapshot(mode) {
    const snapshot = await exports.performanceComparator.createSnapshotFromSession(mode);
    if (snapshot) {
        exports.performanceComparator.recordSnapshot(snapshot);
    }
}
