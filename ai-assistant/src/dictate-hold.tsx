import { Detail, ActionPanel, Action } from "@raycast/api";
import fs from "fs";
import path from "path";
import { exec, ChildProcess } from "child_process";

const SOX_PATH = "/opt/homebrew/bin/sox";
const RECORDINGS_DIR = path.join(process.env.HOME || "", ".config/raycast/extensions/ai-assistant/recordings");

let recordingProcess: ChildProcess | null = null;
let recordingStartTime: number | null = null;
let recordingDuration = 0;
let durationTimer: NodeJS.Timeout | null = null;

function stopRecording() {
  console.log("Stopping recording...");
  if (recordingProcess?.pid) {
    try {
      // Envoyer SIGTERM pour un arrêt propre
      process.kill(recordingProcess.pid, 'SIGTERM');
      console.log(`Sent SIGTERM to recording process (PID: ${recordingProcess.pid})`);
    } catch (error) {
      console.error("Error stopping recording process:", error);
      try {
        // Si SIGTERM échoue, forcer l'arrêt avec SIGKILL
        process.kill(recordingProcess.pid, 'SIGKILL');
        console.log(`Sent SIGKILL to recording process (PID: ${recordingProcess.pid})`);
      } catch (killError) {
        console.error("Error force killing recording process:", killError);
      }
    }
  }
  if (durationTimer) {
    clearInterval(durationTimer);
    durationTimer = null;
  }
}

function setupProcessHandlers(process: ChildProcess, outputPath: string) {
  console.log("Setting up process handlers...");

  // Configurer stdout
  if (process.stdout) {
    console.log("Configuring stdout handler");
    process.stdout.setEncoding('utf8');
    process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log("Recording stdout:", output);
      }
    });
  } else {
    console.log("No stdout available on process");
  }

  // Configurer stderr
  if (process.stderr) {
    console.log("Configuring stderr handler");
    process.stderr.setEncoding('utf8');
    process.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error) {
        console.log("Recording stderr:", error);
      }
    });
  } else {
    console.log("No stderr available on process");
  }

  // Configurer les autres événements
  process.on('spawn', () => {
    console.log("Process spawned successfully");
  });

  process.on('error', (err) => {
    console.error("Process error:", err);
    stopRecording();
  });

  process.on('exit', (code, signal) => {
    const exitMessage = `Recording process (PID: ${process.pid}) exited with code: ${code} and signal: ${signal}`;
    console.log(exitMessage);

    // Vérifier le fichier final
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`Final recording file size: ${stats.size} bytes`);
      if (stats.size === 0) {
        console.error("Warning: Recording file is empty");
        try {
          fs.unlinkSync(outputPath);
          console.log("Deleted empty recording file");
        } catch (error) {
          console.error("Error deleting empty recording file:", error);
        }
      }
    }

    recordingProcess = null;
    recordingStartTime = null;
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
  });

  // Configurer le timer de durée
  durationTimer = setInterval(() => {
    if (recordingStartTime && process.pid) {
      recordingDuration = Math.floor((Date.now() - recordingStartTime) / 1000);
      console.log(`Recording duration: ${recordingDuration}s (Process: sox, PID: ${process.pid})`);

      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`Recording file size: ${stats.size} bytes`);
      } else {
        console.error("Warning: Recording file not created yet");
      }
    }
  }, 5000);
}

export default function Command() {
  console.log("Starting Command function");

  // Start recording immediately if not already recording
  if (!recordingProcess) {
    console.log("No existing recording process found");

    // Vérifier que sox est installé
    if (!fs.existsSync(SOX_PATH)) {
      console.error(`Sox not found at path: ${SOX_PATH}`);
      return;
    }
    console.log("Found sox at:", SOX_PATH);

    // Ensure recordings directory exists
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }

    const outputPath = path.join(RECORDINGS_DIR, `recording-${Date.now()}.wav`);
    console.log("Starting recording to:", outputPath);

    // Update the command to match the working parameters
    const command = `${SOX_PATH} -d -c 1 -r 16000 "${outputPath}"`;
    console.log("Executing command:", command);

    // Créer le processus
    console.log("Creating process...");
    recordingProcess = exec(command, {
      shell: "/bin/zsh",
      env: {
        ...process.env,
        PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
        AUDIODEV: "default",
        AUDIODRIVER: "coreaudio"
      }
    });

    // Configurer les handlers avant de continuer
    setupProcessHandlers(recordingProcess, outputPath);

    recordingStartTime = Date.now();
    console.log(`Recording started at: ${new Date(recordingStartTime).toISOString()}`);
    console.log(`Process ID: ${recordingProcess.pid}`);
    console.log(`Process command: ${command}`);
    console.log(`Process PATH: /opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`);
    console.log("Audio device: default (CoreAudio)");

    // Handle cleanup when Raycast closes
    process.on('SIGTERM', () => {
      console.log("Received SIGTERM signal, cleaning up...");
      stopRecording();
    });
  } else {
    console.log("Recording process already exists");
  }

  return (
    <Detail
      markdown={`# Recording in Progress 🎙️

Recording is active and saving to: \`${RECORDINGS_DIR}\`

Duration: ${recordingDuration} seconds
${recordingProcess?.pid ? `Process ID: ${recordingProcess.pid}` : ''}

Press ⌘+. to stop recording.`}
      actions={
        <ActionPanel>
          <Action
            title="Stop Recording"
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={() => {
              stopRecording();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
