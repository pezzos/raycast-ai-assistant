import { Action, ActionPanel, List, showHUD, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getAvailableLocalModels,
  cleanupLocalModels,
  isWhisperBinaryWorking,
  isParakeetInstalled,
  installWhisper,
  installParakeet,
  downloadWhisperModel,
  downloadParakeetModel,
  isAppleSiliconCompatible,
  type LocalModel,
  type ModelEngine,
} from "./utils/local-models";

interface EngineStatus {
  whisper: boolean;
  parakeet: boolean;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({ whisper: false, parakeet: false });
  const [models, setModels] = useState<LocalModel[]>([]);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    setIsLoading(true);
    console.log("=== Starting loadModels function ===");
    
    try {
      console.log("Step 1: Checking Whisper binary...");
      const whisperCheckStart = Date.now();
      const whisperInstalled = await Promise.race([
        isWhisperBinaryWorking(),
        new Promise<boolean>((resolve) => setTimeout(() => {
          console.log("Whisper check timed out after 3s");
          resolve(false);
        }, 3000))
      ]);
      console.log(`Whisper check completed in ${Date.now() - whisperCheckStart}ms:`, whisperInstalled);

      console.log("Step 2: Checking Parakeet installation...");
      const parakeetCheckStart = Date.now();
      const parakeetInstalled = await Promise.race([
        isParakeetInstalled(),
        new Promise<boolean>((resolve) => setTimeout(() => {
          console.log("Parakeet check timed out after 3s");
          resolve(false);
        }, 3000))
      ]);
      console.log(`Parakeet check completed in ${Date.now() - parakeetCheckStart}ms:`, parakeetInstalled);
      
      setEngineStatus({ whisper: whisperInstalled, parakeet: parakeetInstalled });

      console.log("Step 3: Getting available models...");
      const modelsStart = Date.now();
      
      // Load models with shorter timeout to prevent hanging
      const availableModels = await Promise.race([
        getAvailableLocalModels(),
        new Promise<never>((_, reject) => 
          setTimeout(() => {
            console.log("Model loading timed out after 5s");
            reject(new Error("Timeout loading models"));
          }, 5000)
        )
      ]);

      console.log(`Models loaded in ${Date.now() - modelsStart}ms:`, availableModels.length);
      setModels(availableModels);
      console.log("=== loadModels completed successfully ===");
    } catch (error) {
      console.error("Error loading models:", error);
      // Set empty models on error to prevent infinite loading
      setModels([]);
      console.log("=== loadModels completed with error ===");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInstallWhisper() {
    try {
      await installWhisper();
      await loadModels();
    } catch (error) {
      console.error("Error installing Whisper:", error);
      await showHUD("❌ Failed to install Whisper");
    }
  }

  async function handleInstallParakeet() {
    try {
      await installParakeet();
      await loadModels();
    } catch (error) {
      console.error("Error installing Parakeet:", error);
      await showHUD("❌ Failed to install Parakeet");
    }
  }

  async function handleDownloadModel(engine: ModelEngine, modelId: string) {
    try {
      if (engine === "whisper") {
        await downloadWhisperModel(modelId);
      } else if (engine === "parakeet") {
        await downloadParakeetModel(modelId);
      }
      await loadModels();
    } catch (error) {
      console.error("Error downloading model:", error);
      await showHUD(`❌ Failed to download ${modelId} model`);
    }
  }

  async function handleCleanup() {
    try {
      await cleanupLocalModels();
      await loadModels();
    } catch (error) {
      console.error("Error cleaning up local models:", error);
      await showHUD("❌ Failed to clean up local model files");
    }
  }

  const noEnginesInstalled = !engineStatus.whisper && !engineStatus.parakeet;

  if (noEnginesInstalled) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="No Local Engines Installed"
          description="Install Whisper or Parakeet to use offline speech recognition."
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Install Engines">
                <Action title="Install Whisper" onAction={handleInstallWhisper} icon={Icon.Download} />
                {isAppleSiliconCompatible() && (
                  <Action
                    title="Install Parakeet (Apple Silicon)"
                    onAction={handleInstallParakeet}
                    icon={Icon.Download}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Clean up All Local Files"
                  onAction={handleCleanup}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["opt", "cmd"], key: "backspace" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const getCompatibilityStatus = (model: LocalModel) => {
    if (!model.isCompatible) return "❌ Not Compatible";
    if (model.isInstalled) return "✅ Downloaded";
    return "⬇️ Available";
  };

  const whisperModels = models.filter((m) => m.engine === "whisper");
  const parakeetModels = models.filter((m) => m.engine === "parakeet");

  return (
    <List isLoading={isLoading}>
      {!engineStatus.whisper && (
        <List.Section title="Install Whisper Engine">
          <List.Item
            title="🤖 Whisper Engine"
            subtitle="Universal compatibility, multiple model sizes"
            accessories={[{ text: "Not Installed", icon: Icon.Download }]}
            actions={
              <ActionPanel>
                <Action title="Install Whisper" onAction={handleInstallWhisper} icon={Icon.Download} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!engineStatus.parakeet && isAppleSiliconCompatible() && (
        <List.Section title="Install Parakeet Engine">
          <List.Item
            title="🦜 Parakeet Engine"
            subtitle="Apple Silicon optimized, ultra-fast transcription (60x faster)"
            accessories={[{ text: "Not Installed", icon: Icon.Download }]}
            actions={
              <ActionPanel>
                <Action title="Install Parakeet" onAction={handleInstallParakeet} icon={Icon.Download} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {engineStatus.whisper && whisperModels.length > 0 && (
        <List.Section title="🤖 Whisper Models">
          {whisperModels.map((model) => {
            const modelId = model.id.replace("whisper-", "");
            return (
              <List.Item
                key={model.id}
                title={model.name}
                subtitle={model.description}
                accessories={[
                  {
                    text: getCompatibilityStatus(model),
                    icon: model.isInstalled ? Icon.Checkmark : Icon.Download,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {!model.isInstalled && model.isCompatible && (
                        <Action
                          title={`Download ${model.name}`}
                          onAction={() => handleDownloadModel("whisper", modelId)}
                          icon={Icon.Download}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Clean up All Local Files"
                        onAction={handleCleanup}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["opt", "cmd"], key: "backspace" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {engineStatus.parakeet && parakeetModels.length > 0 && (
        <List.Section title="🦜 Parakeet Models">
          {parakeetModels.map((model) => {
            const modelId = model.id.replace("parakeet-", "");
            return (
              <List.Item
                key={model.id}
                title={model.name}
                subtitle={`${model.description}${model.requirements ? ` • ${model.requirements}` : ""}`}
                accessories={[
                  {
                    text: getCompatibilityStatus(model),
                    icon: model.isInstalled ? Icon.Checkmark : model.isCompatible ? Icon.Download : Icon.XMarkCircle,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {!model.isInstalled && model.isCompatible && (
                        <Action
                          title={`Download ${model.name}`}
                          onAction={() => handleDownloadModel("parakeet", modelId)}
                          icon={Icon.Download}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Clean up All Local Files"
                        onAction={handleCleanup}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["opt", "cmd"], key: "backspace" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {(engineStatus.whisper || engineStatus.parakeet) && (
        <List.Section title="System Info">
          <List.Item
            title="Apple Silicon Status"
            subtitle={isAppleSiliconCompatible() ? "Compatible with Parakeet" : "Parakeet requires Apple Silicon"}
            accessories={[
              {
                text: isAppleSiliconCompatible() ? "Compatible" : "Intel Mac",
                icon: isAppleSiliconCompatible() ? Icon.Checkmark : Icon.XMarkCircle,
              },
            ]}
          />
        </List.Section>
      )}
    </List>
  );
}
