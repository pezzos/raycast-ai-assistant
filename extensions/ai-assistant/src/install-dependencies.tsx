import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { checkDependencies, installDependency, DependencyCheckResult, DependencyStatus } from "./utils/dependencies";

export default function Command() {
  const [dependencies, setDependencies] = useState<DependencyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState<string | null>(null);

  useEffect(() => {
    checkDependenciesStatus();
  }, []);

  const checkDependenciesStatus = async () => {
    setIsLoading(true);
    try {
      const status: DependencyCheckResult = await checkDependencies();
      setDependencies(status.dependencies);
    } catch (error) {
      console.error("Error checking dependencies:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to check dependencies status"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallDependency = async (dependencyName: string) => {
    setIsInstalling(dependencyName);
    try {
      await installDependency(dependencyName);
      await checkDependenciesStatus(); // Refresh status after installation
      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `${dependencyName} installed successfully!`
      });
    } catch (error) {
      console.error(`Error installing ${dependencyName}:`, error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Installation Failed",
        message: `Failed to install ${dependencyName}. Please check the logs.`
      });
    } finally {
      setIsInstalling(null);
    }
  };

  const getStatusIcon = (isInstalled: boolean) => {
    return isInstalled 
      ? { icon: Icon.CheckCircle, tintColor: Color.Green }
      : { icon: Icon.XMarkCircle, tintColor: Color.Red };
  };

  const getStatusText = (isInstalled: boolean) => {
    return isInstalled ? "Installed" : "Not Installed";
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search dependencies...">
      <List.Section title="System Dependencies">
        {dependencies.map((dep) => (
          <List.Item
            key={dep.name}
            title={dep.name}
            subtitle={dep.description}
            accessories={[
              {
                text: dep.version || getStatusText(dep.isInstalled),
                ...getStatusIcon(dep.isInstalled)
              }
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Status"
                  icon={Icon.ArrowClockwise}
                  onAction={checkDependenciesStatus}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                {!dep.isInstalled && (
                  <Action
                    title={isInstalling === dep.name ? "Installing..." : `Install ${dep.name}`}
                    icon={Icon.Download}
                    onAction={() => handleInstallDependency(dep.name)}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                )}
                {dep.installCommand && (
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={dep.installCommand}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      
      <List.Section title="Installation Info">
        <List.Item
          title="About Dependencies"
          subtitle="Required system dependencies for AI Assistant"
          accessories={[{ text: "ℹ️" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Documentation"
                url="https://github.com/pezzos/raycast-ai-assistant#prerequisites"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}