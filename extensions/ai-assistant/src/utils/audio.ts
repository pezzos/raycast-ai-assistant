import { exec } from "child_process";
import { promisify } from "util";
import { LocalStorage } from "@raycast/api";
import { SILENCE_TIMEOUT_KEY, SILENCE_THRESHOLD_KEY } from "../settings";

const execAsync = promisify(exec);

/**
 * Convert user-friendly threshold value (0-10) to percentage
 * 0 = 1%, 1 = 1.5%, 2 = 2%, ..., 10 = 6%
 */
function thresholdValueToPercentage(value: number): string {
  const percentage = 1 + value * 0.5; // 0->1%, 1->1.5%, 2->2%, ..., 10->6%
  return `${percentage}%`;
}

/**
 * Get optimized silence detection parameters and audio format from user settings
 */
export async function getOptimizedAudioParams(): Promise<{
  timeout: number;
  threshold: string;
  soxArgs: string;
}> {
  // Get user settings or use defaults
  const savedSilenceTimeout = await LocalStorage.getItem<string>(SILENCE_TIMEOUT_KEY);
  const savedSilenceThreshold = await LocalStorage.getItem<string>(SILENCE_THRESHOLD_KEY);

  const timeout = savedSilenceTimeout ? parseFloat(savedSilenceTimeout) : 2.0;
  const thresholdValue = savedSilenceThreshold ? parseInt(savedSilenceThreshold) : 2; // Default to 2 (2%)
  const threshold = thresholdValueToPercentage(thresholdValue);

  return {
    timeout,
    threshold,
    soxArgs: "-r 16000 -c 1 -b 16", // Direct recording: 16kHz mono 16-bit
  };
}

/**
 * Test audio input device availability and quality
 */
export async function testAudioDevice(): Promise<{ available: boolean; quality: "good" | "fair" | "poor" }> {
  try {
    // Quick test recording to check device availability
    const testDuration = 0.5; // 500ms test
    const testCommand = `export PATH="/opt/homebrew/bin:$PATH"; "/opt/homebrew/bin/sox" -d -t wav - trim 0 ${testDuration} 2>/dev/null | wc -c`;

    const { stdout } = await execAsync(testCommand, { shell: "/bin/zsh" });
    const dataSize = parseInt(stdout.trim());

    if (dataSize === 0) {
      return { available: false, quality: "poor" };
    }

    // Estimate quality based on data size (very rough heuristic)
    const expectedSize = testDuration * 44100 * 2; // 44.1kHz, 16-bit
    const quality = dataSize > expectedSize * 0.8 ? "good" : dataSize > expectedSize * 0.4 ? "fair" : "poor";

    return { available: true, quality };
  } catch (error) {
    console.warn("Audio device test failed:", error);
    return { available: false, quality: "poor" };
  }
}

/**
 * Mute or unmute system audio output
 * @param mute Whether to mute (true) or unmute (false) the audio
 * @returns Promise<void>
 */
export async function setSystemAudioMute(mute: boolean): Promise<void> {
  try {
    const command = `osascript -e 'set volume ${mute ? "with" : "without"} output muted'`;
    await execAsync(command);
  } catch (error) {
    console.error("Error setting system audio mute:", error);
  }
}

/**
 * Get current system audio mute state
 * @returns Promise<boolean> True if system audio is muted, false otherwise
 */
export async function isSystemAudioMuted(): Promise<boolean> {
  try {
    const command = `osascript -e 'output muted of (get volume settings)'`;
    const { stdout } = await execAsync(command);
    return stdout.trim() === "true";
  } catch (error) {
    console.error("Error getting system audio mute state:", error);
    return false;
  }
}
