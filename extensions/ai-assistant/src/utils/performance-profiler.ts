import { LocalStorage } from "@raycast/api";
import fs from "fs";
import path from "path";

interface PerformanceMetric {
  timestamp: number;
  command: string;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: {
    mode?: string;
    model?: string;
    engine?: string;
    audioLength?: number;
    textLength?: number;
    language?: string;
    error?: string;
    systemInfo?: {
      platform: string;
      arch: string;
      memory?: number;
    };
  };
}

interface PerformanceSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  command: string;
  metrics: PerformanceMetric[];
  totalDuration?: number;
}

class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private currentSession: PerformanceSession | null = null;
  private readonly STORAGE_KEY = "performance-logs";
  private readonly MAX_SESSIONS = 100; // Garde les 100 dernières sessions
  private readonly LOG_DIR = path.join(__dirname, "..", "performance-logs");

  private constructor() {
    this.ensureLogDirectory();
  }

  static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler();
    }
    return PerformanceProfiler.instance;
  }

  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.LOG_DIR)) {
        fs.mkdirSync(this.LOG_DIR, { recursive: true });
      }
    } catch (error) {
      console.warn("Could not create performance log directory:", error);
    }
  }

  /**
   * Démarre une nouvelle session de profiling pour une commande
   */
  async startSession(command: string): Promise<string> {
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
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.endTime = Date.now();
    this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime;

    console.log(
      `🏁 [PERF] Session ${this.currentSession.sessionId} completed in ${this.currentSession.totalDuration}ms`,
    );

    // Sauvegarde la session
    await this.saveSession(this.currentSession);
    this.currentSession = null;
  }

  /**
   * Mesure et log une opération avec métadonnées détaillées
   */
  async measureOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Partial<PerformanceMetric["metadata"]>,
  ): Promise<T> {
    const start = Date.now();
    let success = false;
    let error: string | undefined;

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

      const metric: PerformanceMetric = {
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
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      const duration = Date.now() - start;

      const metric: PerformanceMetric = {
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
  private logMetric(metric: PerformanceMetric): void {
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
  private async saveSession(session: PerformanceSession): Promise<void> {
    try {
      // Sauvegarde dans LocalStorage
      const existingSessions = await this.loadSessionsFromStorage();
      existingSessions.push(session);

      // Garde seulement les dernières sessions
      const recentSessions = existingSessions.slice(-this.MAX_SESSIONS);
      await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentSessions));

      // Sauvegarde aussi dans un fichier pour analyse long terme
      await this.saveSessionToFile(session);
    } catch (error) {
      console.error("Failed to save performance session:", error);
    }
  }

  /**
   * Sauvegarde une session dans un fichier JSON
   */
  private async saveSessionToFile(session: PerformanceSession): Promise<void> {
    try {
      const date = new Date(session.startTime);
      const filename = `perf-${date.toISOString().split("T")[0]}.jsonl`;
      const filepath = path.join(this.LOG_DIR, filename);

      // Format JSONL pour faciliter l'analyse
      const logLine = JSON.stringify(session) + "\n";
      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.warn("Could not save session to file:", error);
    }
  }

  /**
   * Charge les sessions depuis le storage
   */
  private async loadSessionsFromStorage(): Promise<PerformanceSession[]> {
    try {
      const stored = await LocalStorage.getItem<string>(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load performance sessions:", error);
      return [];
    }
  }

  /**
   * Récupère les statistiques de performance récentes
   */
  async getPerformanceStats(
    command?: string,
    days: number = 7,
  ): Promise<{
    sessions: PerformanceSession[];
    averages: Record<string, number>;
    trends: Record<string, number[]>;
  }> {
    const sessions = await this.loadSessionsFromStorage();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const filteredSessions = sessions.filter(
      (session) => session.startTime > cutoff && (!command || session.command === command),
    );

    // Calcul des moyennes par opération
    const operationTimes: Record<string, number[]> = {};

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

    const averages: Record<string, number> = {};
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
  async cleanup(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
      const sessions = await this.loadSessionsFromStorage();
      const recentSessions = sessions.filter((session) => session.startTime > cutoff);

      await LocalStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentSessions));

      // Nettoyage des fichiers
      if (fs.existsSync(this.LOG_DIR)) {
        const files = fs.readdirSync(this.LOG_DIR);
        files.forEach((file) => {
          const filePath = path.join(this.LOG_DIR, file);
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < cutoff) {
            fs.unlinkSync(filePath);
          }
        });
      }
    } catch (error) {
      console.error("Failed to cleanup performance logs:", error);
    }
  }
}

// Export singleton instance
export const performanceProfiler = PerformanceProfiler.getInstance();

/**
 * Wrapper fonction pour profiler automatiquement une fonction
 */
export async function profiledOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Partial<PerformanceMetric["metadata"]>,
): Promise<T> {
  return performanceProfiler.measureOperation(operation, fn, metadata);
}

/**
 * Décorateur pour profiler automatiquement une méthode de classe
 */
export function profile(operation?: string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const opName = operation || `${(target as { constructor: { name: string } }).constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: unknown[]) {
      return performanceProfiler.measureOperation(opName, () => method.apply(this, args));
    };
  };
}
