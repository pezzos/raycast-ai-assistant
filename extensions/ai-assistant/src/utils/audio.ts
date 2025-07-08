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
 * Test audio setup without recording (fast, non-intrusive)
 */
export async function testAudioSetup(): Promise<{ 
  soxAvailable: boolean; 
  inputDeviceAvailable: boolean; 
  error?: string 
}> {
  try {
    // Check if SOX is available
    const soxCheck = await execAsync('which /opt/homebrew/bin/sox', { shell: "/bin/zsh" });
    const soxAvailable = soxCheck.stdout.trim().length > 0;

    if (!soxAvailable) {
      return { 
        soxAvailable: false, 
        inputDeviceAvailable: false, 
        error: "SOX not found - please install: brew install sox" 
      };
    }

    // Check input device via system profiler (no recording)
    const deviceCheck = await execAsync(
      '/usr/sbin/system_profiler SPAudioDataType | grep -A 2 "Default Input Device: Yes" | grep "Input Channels"',
      { shell: "/bin/zsh" }
    );
    
    const inputDeviceAvailable = deviceCheck.stdout.trim().length > 0;

    if (!inputDeviceAvailable) {
      return { 
        soxAvailable: true, 
        inputDeviceAvailable: false, 
        error: "No input audio device detected" 
      };
    }

    return { soxAvailable: true, inputDeviceAvailable: true };
  } catch (error) {
    console.warn("Audio setup test failed:", error);
    return { 
      soxAvailable: false, 
      inputDeviceAvailable: false, 
      error: `Audio setup check failed: ${error}` 
    };
  }
}

/**
 * Test audio input device availability and quality (with recording - use sparingly)
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

// Global state to track original volume level
let originalVolumeLevel: number | null = null;

/**
 * Get current system audio volume level
 * @returns Promise<number> Current volume level (0-100)
 */
export async function getSystemVolumeLevel(): Promise<number> {
  try {
    const command = `osascript -e 'output volume of (get volume settings)'`;
    const { stdout } = await execAsync(command);
    return parseInt(stdout.trim());
  } catch (error) {
    console.error("Error getting system audio volume level:", error);
    return 50; // Default fallback
  }
}

/**
 * Set system audio volume level
 * @param level Volume level (0-100)
 * @returns Promise<void>
 */
export async function setSystemVolumeLevel(level: number): Promise<void> {
  try {
    const clampedLevel = Math.max(0, Math.min(100, level));
    const command = `osascript -e 'set volume output volume ${clampedLevel}'`;
    await execAsync(command);
  } catch (error) {
    console.error("Error setting system audio volume level:", error);
  }
}

/**
 * Fade in volume progressively from 0 to target level
 * @param targetLevel Target volume level (0-100)
 * @param duration Duration in milliseconds (default: 500ms)
 * @returns Promise<void>
 */
export async function fadeInVolume(targetLevel: number, duration: number = 500): Promise<void> {
  const steps = 10; // Number of fade steps
  const stepDuration = duration / steps;
  const stepIncrement = targetLevel / steps;

  for (let i = 1; i <= steps; i++) {
    const currentLevel = Math.round(stepIncrement * i);
    await setSystemVolumeLevel(currentLevel);

    // Wait between steps except for the last one
    if (i < steps) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }
  }
}

/**
 * Mute or unmute system audio output using mute-only approach
 * @param mute Whether to mute (true) or unmute (false) the audio
 * @returns Promise<void>
 */
export async function setSystemAudioMute(mute: boolean): Promise<void> {
  try {
    if (mute) {
      // Capture current volume level before muting
      originalVolumeLevel = await getSystemVolumeLevel();
      
      // Set system mute only - don't touch volume
      await execAsync(`osascript -e 'set volume with output muted'`);
    } else {
      // Restore original volume with fade-in (system stays muted during fade)
      if (originalVolumeLevel !== null) {
        // Wait 1.5 seconds for audio capture device to release processes
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        // Fade in to original volume over 0.5s (this will automatically unmute when volume > 0)
        await fadeInVolume(originalVolumeLevel, 500);
        originalVolumeLevel = null; // Reset after restoration
      }
    }
  } catch (error) {
    console.error("Error setting system audio mute:", error);
  }
}

/**
 * Get current system audio mute state (checks system mute only)
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
