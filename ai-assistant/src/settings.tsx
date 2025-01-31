import { Action, ActionPanel, Form, LocalStorage, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

export const DICTATE_TARGET_LANG_KEY = "dictate-target-language";
export const WHISPER_MODE_KEY = "whisper-mode";
export const WHISPER_MODEL_KEY = "whisper-model";

const LANGUAGE_OPTIONS = [
  { value: "auto", title: "Auto-detect" },
  { value: "en", title: "English" },
  { value: "fr", title: "French" },
  { value: "es", title: "Spanish" },
  { value: "de", title: "German" },
  { value: "it", title: "Italian" },
  { value: "pt", title: "Portuguese" },
  { value: "nl", title: "Dutch" },
  { value: "ru", title: "Russian" },
  { value: "zh", title: "Chinese" },
  { value: "ja", title: "Japanese" },
  { value: "ko", title: "Korean" },
];

const WHISPER_MODE_OPTIONS = [
  { value: "online", title: "Online (OpenAI API)" },
  { value: "local", title: "Local (Faster, Offline)" },
];

const WHISPER_MODEL_OPTIONS = [
  { value: "tiny", title: "Tiny (Fast, Less Accurate)" },
  { value: "base", title: "Base (Balanced)" },
  { value: "small", title: "Small (More Accurate)" },
  { value: "medium", title: "Medium (Most Accurate)" },
];

const MODEL_OPTIONS = [
  { value: "gpt-4o", title: "GPT-4o (Most Capable)" },
  { value: "gpt-4o-mini", title: "GPT-4o Mini (Fastest/Recommended)" },
  { value: "o1", title: "o1 (Most Powerful reasoning model)" },
  { value: "o1-mini", title: "o1-mini (Smaller reasoning model)" },
];

interface FormValues {
  targetLanguage: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  llmModel: string;
  whisperMode: string;
  whisperModel: string;
  fixText: boolean;
  showExploreMore: boolean;
}

export default function Command() {
  const [targetLanguage, setTargetLanguage] = useState<string>("auto");
  const [primaryLanguage, setPrimaryLanguage] = useState<string>("fr");
  const [secondaryLanguage, setSecondaryLanguage] = useState<string>("en");
  const [llmModel, setLlmModel] = useState<string>("gpt-4o-mini");
  const [whisperMode, setWhisperMode] = useState<string>("online");
  const [whisperModel, setWhisperModel] = useState<string>("base");
  const [fixText, setFixText] = useState<boolean>(true);
  const [showExploreMore, setShowExploreMore] = useState<boolean>(true);

  useEffect(() => {
    // Load saved preferences
    LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY).then((savedLang) => {
      if (savedLang) {
        setTargetLanguage(savedLang);
      }
    });
    LocalStorage.getItem<string>(WHISPER_MODE_KEY).then((savedMode) => {
      if (savedMode) {
        setWhisperMode(savedMode);
      }
    });
    LocalStorage.getItem<string>(WHISPER_MODEL_KEY).then((savedModel) => {
      if (savedModel) {
        setWhisperModel(savedModel);
      }
    });
  }, []);

  const handleSubmit = async (values: FormValues) => {
    await LocalStorage.setItem(DICTATE_TARGET_LANG_KEY, values.targetLanguage);
    await LocalStorage.setItem(WHISPER_MODE_KEY, values.whisperMode);
    await LocalStorage.setItem(WHISPER_MODEL_KEY, values.whisperModel);
    await showHUD("Settings saved successfully");
    await popToRoot();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure your AI Assistant preferences" />

      <Form.Separator />

      <Form.Description text="Language Settings" />

      <Form.Dropdown
        id="primaryLanguage"
        title="Primary Language"
        info="Your main language for translations and AI interactions"
        value={primaryLanguage}
        onChange={setPrimaryLanguage}
      >
        {LANGUAGE_OPTIONS.filter(lang => lang.value !== "auto").map((lang) => (
          <Form.Dropdown.Item
            key={lang.value}
            value={lang.value}
            title={lang.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="secondaryLanguage"
        title="Secondary Language"
        info="Your alternate language for translations"
        value={secondaryLanguage}
        onChange={setSecondaryLanguage}
      >
        {LANGUAGE_OPTIONS.filter(lang => lang.value !== "auto").map((lang) => (
          <Form.Dropdown.Item
            key={lang.value}
            value={lang.value}
            title={lang.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="targetLanguage"
        title="Default Output Language"
        info="Language used as output after speech recognition"
        value={targetLanguage}
        onChange={setTargetLanguage}
      >
        {LANGUAGE_OPTIONS.map((lang) => (
          <Form.Dropdown.Item
            key={lang.value}
            value={lang.value}
            title={lang.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Speech Recognition Settings" />

      <Form.Dropdown
        id="whisperMode"
        title="Whisper Mode"
        info="Choose between online (OpenAI API) or local processing"
        value={whisperMode}
        onChange={setWhisperMode}
      >
        {WHISPER_MODE_OPTIONS.map((mode) => (
          <Form.Dropdown.Item
            key={mode.value}
            value={mode.value}
            title={mode.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="whisperModel"
        title="Local Whisper Model"
        info="Select the local Whisper model to use (only applies when using local mode)"
        value={whisperModel}
        onChange={setWhisperModel}
      >
        {WHISPER_MODEL_OPTIONS.map((model) => (
          <Form.Dropdown.Item
            key={model.value}
            value={model.value}
            title={model.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="AI Model Settings" />

      <Form.Dropdown
        id="llmModel"
        title="AI Model"
        info="Select the AI model to use for all operations"
        value={llmModel}
        onChange={setLlmModel}
      >
        {MODEL_OPTIONS.map((model) => (
          <Form.Dropdown.Item
            key={model.value}
            value={model.value}
            title={model.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Feature Settings" />

      <Form.Checkbox
        id="fixText"
        label="Improve Text Quality"
        info="Automatically fix grammar and spelling during translations and text generation"
        value={fixText}
        onChange={setFixText}
      />

      <Form.Checkbox
        id="showExploreMore"
        label="Show 'Explore More' in Summaries"
        info="Include additional resources and related topics in page summaries"
        value={showExploreMore}
        onChange={setShowExploreMore}
      />
    </Form>
  );
}
