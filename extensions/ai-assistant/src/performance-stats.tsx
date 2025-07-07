import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { performanceProfiler } from "./utils/performance-profiler";

interface PerformanceData {
  sessions: unknown[];
  averages: Record<string, number>;
  trends: Record<string, number[]>;
}

export default function Command() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    loadPerformanceData();
  }, [selectedDays]);

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      const data = await performanceProfiler.getPerformanceStats(undefined, selectedDays);
      setPerformanceData(data);
    } catch (error) {
      console.error("Failed to load performance data:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load performance data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getPerformanceIcon = (avgTime: number, operation: string): string => {
    // Seuils spécifiques par type d'opération
    if (operation.includes("transcription")) {
      if (avgTime < 2000) return "🟢"; // < 2s très rapide
      if (avgTime < 5000) return "🟡"; // < 5s acceptable
      return "🔴"; // > 5s lent
    }

    if (operation.includes("llm") || operation.includes("prompt")) {
      if (avgTime < 3000) return "🟢"; // < 3s très rapide
      if (avgTime < 8000) return "🟡"; // < 8s acceptable
      return "🔴"; // > 8s lent
    }

    if (operation.includes("recording")) {
      return "🎙️"; // Dépend de l'utilisateur
    }

    // Seuils généraux
    if (avgTime < 1000) return "🟢";
    if (avgTime < 3000) return "🟡";
    return "🔴";
  };

  const getSummaryStats = () => {
    if (!performanceData) return null;

    const whisperLocal = Object.entries(performanceData.averages)
      .filter(([key]) => key.includes("local") && key.includes("transcription"))
      .map(([, time]) => time);

    const whisperCloud = Object.entries(performanceData.averages)
      .filter(([key]) => key.includes("cloud-transcription"))
      .map(([, time]) => time);

    const llmOperations = Object.entries(performanceData.averages)
      .filter(([key]) => key.includes("llm") || key.includes("prompt"))
      .map(([, time]) => time);

    return {
      whisperLocalAvg: whisperLocal.length > 0 ? whisperLocal.reduce((a, b) => a + b, 0) / whisperLocal.length : null,
      whisperCloudAvg: whisperCloud.length > 0 ? whisperCloud.reduce((a, b) => a + b, 0) / whisperCloud.length : null,
      llmAvg: llmOperations.length > 0 ? llmOperations.reduce((a, b) => a + b, 0) / llmOperations.length : null,
      totalSessions: performanceData.sessions.length,
    };
  };

  const summaryStats = getSummaryStats();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search performance metrics..."
      navigationTitle="Performance Statistics"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Period"
          value={selectedDays.toString()}
          onChange={(value) => setSelectedDays(parseInt(value))}
        >
          <List.Dropdown.Item title="Last 24 hours" value="1" />
          <List.Dropdown.Item title="Last 3 days" value="3" />
          <List.Dropdown.Item title="Last week" value="7" />
          <List.Dropdown.Item title="Last month" value="30" />
        </List.Dropdown>
      }
    >
      {summaryStats && (
        <List.Section title="Summary">
          <List.Item title="Total Sessions" subtitle={`${summaryStats.totalSessions} sessions analyzed`} icon="📊" />
          {summaryStats.whisperLocalAvg && (
            <List.Item
              title="Whisper Local Average"
              subtitle={formatDuration(summaryStats.whisperLocalAvg)}
              icon={getPerformanceIcon(summaryStats.whisperLocalAvg, "transcription")}
              accessories={[{ text: "Local Processing" }]}
            />
          )}
          {summaryStats.whisperCloudAvg && (
            <List.Item
              title="Whisper Cloud Average"
              subtitle={formatDuration(summaryStats.whisperCloudAvg)}
              icon={getPerformanceIcon(summaryStats.whisperCloudAvg, "transcription")}
              accessories={[{ text: "OpenAI API" }]}
            />
          )}
          {summaryStats.llmAvg && (
            <List.Item
              title="LLM Operations Average"
              subtitle={formatDuration(summaryStats.llmAvg)}
              icon={getPerformanceIcon(summaryStats.llmAvg, "llm")}
              accessories={[{ text: "Text Generation" }]}
            />
          )}
          {summaryStats.whisperLocalAvg && summaryStats.whisperCloudAvg && (
            <List.Item
              title="Local vs Cloud Comparison"
              subtitle={
                summaryStats.whisperLocalAvg < summaryStats.whisperCloudAvg
                  ? `Local is ${formatDuration(summaryStats.whisperCloudAvg - summaryStats.whisperLocalAvg)} faster`
                  : `Cloud is ${formatDuration(summaryStats.whisperLocalAvg - summaryStats.whisperCloudAvg)} faster`
              }
              icon={summaryStats.whisperLocalAvg < summaryStats.whisperCloudAvg ? "🏠" : "☁️"}
              accessories={[
                {
                  text: `${(
                    (Math.abs(summaryStats.whisperLocalAvg - summaryStats.whisperCloudAvg) /
                      Math.max(summaryStats.whisperLocalAvg, summaryStats.whisperCloudAvg)) *
                    100
                  ).toFixed(1)}% difference`,
                },
              ]}
            />
          )}
        </List.Section>
      )}

      <List.Section title="Detailed Operations">
        {performanceData &&
          Object.entries(performanceData.averages)
            .sort(([, a], [, b]) => b - a) // Sort by duration descending
            .map(([operation, avgTime]) => {
              const trends = performanceData.trends[operation] || [];
              const sampleCount = trends.length;
              const minTime = Math.min(...trends);
              const maxTime = Math.max(...trends);

              return (
                <List.Item
                  key={operation}
                  title={operation.replace(/::/g, " → ")}
                  subtitle={`Average: ${formatDuration(avgTime)}`}
                  icon={getPerformanceIcon(avgTime, operation)}
                  accessories={[
                    { text: `${sampleCount} samples` },
                    { text: `${formatDuration(minTime)} - ${formatDuration(maxTime)}` },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Operation Name" content={operation} />
                      <Action.CopyToClipboard
                        title="Copy Statistics"
                        content={`${operation}: avg ${formatDuration(avgTime)}, samples: ${sampleCount}, range: ${formatDuration(minTime)} - ${formatDuration(maxTime)}`}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Clean Old Performance Data"
          subtitle="Remove performance data older than 30 days"
          icon="🗑️"
          actions={
            <ActionPanel>
              <Action
                title="Clean Old Data"
                onAction={async () => {
                  try {
                    await performanceProfiler.cleanup(30);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Performance data cleaned",
                    });
                    await loadPerformanceData();
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to clean data",
                      message: error instanceof Error ? error.message : "Unknown error",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Refresh Data"
          subtitle="Reload performance statistics"
          icon="🔄"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadPerformanceData} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
