import { showHUD } from "@raycast/api";
import { performanceProfiler } from "./performance-profiler";

/**
 * Measures the execution time of an async function and logs it
 * Enhanced version with performance profiling integration
 * @param name Name of the operation being timed
 * @param fn Function to execute and time
 * @param metadata Optional metadata for profiling
 * @returns Result of the function execution
 */
export async function measureTime<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    // Enhanced logging with metadata summary
    const metadataStr = metadata ? 
      ` [${Object.entries(metadata)
        .filter(([key, value]) => key !== 'systemInfo' && value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')}]` : '';
    
    console.log(`⏱️ ${name} took ${duration}ms${metadataStr}`);

    // Log vers le profiler avancé aussi
    await performanceProfiler.measureOperation(name, async () => result, metadata);

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name} failed after ${duration}ms:`, error);

    // Log l'erreur vers le profiler
    try {
      await performanceProfiler.measureOperation(
        name,
        async () => {
          throw error;
        },
        metadata,
      );
    } catch {
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
export async function measureTimeAdvanced<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  return performanceProfiler.measureOperation(name, fn, metadata);
}

let notificationInterval: NodeJS.Timeout | null = null;

/**
 * Starts periodic notifications during a long-running process
 * @param message Base message to show
 * @param intervalMs Interval between notifications in milliseconds
 */
export function startPeriodicNotification(message: string, intervalMs: number = 1000) {
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }

  let count = 0;
  notificationInterval = setInterval(() => {
    count++;
    showHUD(`${message} ${".".repeat(count % 4)}`);
  }, intervalMs);
}

/**
 * Stops the periodic notifications
 */
export function stopPeriodicNotification() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}
