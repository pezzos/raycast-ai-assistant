import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Get optimized silence detection parameters based on system capabilities
 */
export function getOptimizedSilenceParams(): { timeout: number; threshold: string } {
  // More aggressive parameters for better responsiveness
  // - Reduced timeout for faster detection
  // - Slightly higher threshold to avoid false positives
  return {
    timeout: 1.5, // Reduced from 2.0s to 1.5s
    threshold: "3%", // Increased from 2% to 3% to avoid noise triggering
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
