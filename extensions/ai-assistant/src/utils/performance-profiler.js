"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceProfiler = void 0;
exports.profiledOperation = profiledOperation;
exports.profile = profile;
const api_1 = require("@raycast/api");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class PerformanceProfiler {
    static instance;
    currentSession = null;
    STORAGE_KEY = "performance-logs";
    MAX_SESSIONS = 100; // Garde les 100 dernières sessions
    LOG_DIR = path_1.default.join(__dirname, "..", "performance-logs");
    constructor() {
        this.ensureLogDirectory();
    }
    static getInstance() {
        if (!PerformanceProfiler.instance) {
            PerformanceProfiler.instance = new PerformanceProfiler();
        }
        return PerformanceProfiler.instance;
    }
    ensureLogDirectory() {
        try {
            if (!fs_1.default.existsSync(this.LOG_DIR)) {
                fs_1.default.mkdirSync(this.LOG_DIR, { recursive: true });
            }
        }
        catch (error) {
            console.warn("Could not create performance log directory:", error);
        }
    }
    /**
     * Démarre une nouvelle session de profiling pour une commande
     */
    async startSession(command) {
        const sessionId = `${command}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.currentSession = {
            sessionId,
            startTime: Date.now(),
            command,
            metrics: [],
        };
        console.log(`🚀 [PERF] Starting session ${sessionId} for command: ${command}`);
        return sessionId;
    }
    /**
     * Termine la session actuelle
     */
    async endSession() {
        if (!this.currentSession) {
            return;
        }
        this.currentSession.endTime = Date.now();
        this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime;
        console.log(`🏁 [PERF] Session ${this.currentSession.sessionId} completed in ${this.currentSession.totalDuration}ms`);
        // Sauvegarde la session
        await this.saveSession(this.currentSession);
        this.currentSession = null;
    }
    /**
     * Mesure et log une opération avec métadonnées détaillées
     */
    async measureOperation(operation, fn, metadata) {
        const start = Date.now();
        let success = false;
        let error;
        try {
            const result = await fn();
            success = true;
            const duration = Date.now() - start;
            // Collecte des informations système
            const systemInfo = {
                platform: process.platform,
                arch: process.arch,
                memory: process.memoryUsage().heapUsed,
            };
            const metric = {
                timestamp: start,
                command: this.currentSession?.command || "unknown",
                operation,
                duration,
                success,
                metadata: {
                    ...metadata,
                    systemInfo,
                },
            };
            this.logMetric(metric);
            if (this.currentSession) {
                this.currentSession.metrics.push(metric);
            }
            return result;
        }
        catch (err) {
            success = false;
            error = err instanceof Error ? err.message : String(err);
            const duration = Date.now() - start;
            const metric = {
                timestamp: start,
                command: this.currentSession?.command || "unknown",
                operation,
                duration,
                success,
                metadata: {
                    ...metadata,
                    error,
                    systemInfo: {
                        platform: process.platform,
                        arch: process.arch,
                        memory: process.memoryUsage().heapUsed,
                    },
                },
            };
            this.logMetric(metric);
            if (this.currentSession) {
                this.currentSession.metrics.push(metric);
            }
            throw err;
        }
    }
    /**
     * Log une métrique individuelle
     */
    logMetric(metric) {
        const statusIcon = metric.success ? "✅" : "❌";
        const metadataStr = metric.metadata
            ? ` | ${Object.entries(metric.metadata)
                .filter(([key, value]) => key !== "systemInfo" && value !== undefined)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")}`
            : "";
        console.log(`${statusIcon} [PERF] ${metric.command}::${metric.operation} took ${metric.duration}ms${metadataStr}`);
    }
    /**
     * Sauvegarde une session dans le storage local et fichier
     */
    async saveSession(session) {
        try {
            // Sauvegarde dans LocalStorage
            const existingSessions = await this.loadSessionsFromStorage();
            existingSessions.push(session);
            // Garde seulement les dernières sessions
            const recentSessions = existingSessions.slice(-this.MAX_SESSIONS);
            await api_1.LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentSessions));
            // Sauvegarde aussi dans un fichier pour analyse long terme
            await this.saveSessionToFile(session);
        }
        catch (error) {
            console.error("Failed to save performance session:", error);
        }
    }
    /**
     * Sauvegarde une session dans un fichier JSON
     */
    async saveSessionToFile(session) {
        try {
            const date = new Date(session.startTime);
            const filename = `perf-${date.toISOString().split("T")[0]}.jsonl`;
            const filepath = path_1.default.join(this.LOG_DIR, filename);
            // Format JSONL pour faciliter l'analyse
            const logLine = JSON.stringify(session) + "\n";
            fs_1.default.appendFileSync(filepath, logLine);
        }
        catch (error) {
            console.warn("Could not save session to file:", error);
        }
    }
    /**
     * Charge les sessions depuis le storage
     */
    async loadSessionsFromStorage() {
        try {
            const stored = await api_1.LocalStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        }
        catch (error) {
            console.error("Failed to load performance sessions:", error);
            return [];
        }
    }
    /**
     * Récupère les statistiques de performance récentes
     */
    async getPerformanceStats(command, days = 7) {
        const sessions = await this.loadSessionsFromStorage();
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const filteredSessions = sessions.filter((session) => session.startTime > cutoff && (!command || session.command === command));
        // Calcul des moyennes par opération
        const operationTimes = {};
        filteredSessions.forEach((session) => {
            session.metrics.forEach((metric) => {
                if (metric.success) {
                    const key = `${metric.command}::${metric.operation}`;
                    if (!operationTimes[key]) {
                        operationTimes[key] = [];
                    }
                    operationTimes[key].push(metric.duration);
                }
            });
        });
        const averages = {};
        Object.entries(operationTimes).forEach(([key, times]) => {
            averages[key] = times.reduce((a, b) => a + b, 0) / times.length;
        });
        return {
            sessions: filteredSessions,
            averages,
            trends: operationTimes,
        };
    }
    /**
     * Nettoie les anciens logs
     */
    async cleanup(daysToKeep = 30) {
        try {
            const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
            const sessions = await this.loadSessionsFromStorage();
            const recentSessions = sessions.filter((session) => session.startTime > cutoff);
            await api_1.LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentSessions));
            // Nettoyage des fichiers
            if (fs_1.default.existsSync(this.LOG_DIR)) {
                const files = fs_1.default.readdirSync(this.LOG_DIR);
                files.forEach((file) => {
                    const filePath = path_1.default.join(this.LOG_DIR, file);
                    const stats = fs_1.default.statSync(filePath);
                    if (stats.mtime.getTime() < cutoff) {
                        fs_1.default.unlinkSync(filePath);
                    }
                });
            }
        }
        catch (error) {
            console.error("Failed to cleanup performance logs:", error);
        }
    }
}
// Export singleton instance
exports.performanceProfiler = PerformanceProfiler.getInstance();
/**
 * Wrapper fonction pour profiler automatiquement une fonction
 */
async function profiledOperation(operation, fn, metadata) {
    return exports.performanceProfiler.measureOperation(operation, fn, metadata);
}
/**
 * Décorateur pour profiler automatiquement une méthode de classe
 */
function profile(operation) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        const opName = operation || `${target.constructor.name}.${propertyName}`;
        descriptor.value = async function (...args) {
            return exports.performanceProfiler.measureOperation(opName, () => method.apply(this, args));
        };
    };
}
