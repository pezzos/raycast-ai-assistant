import { Action, ActionPanel, Form, LocalStorage, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

export const DICTATE_TARGET_LANG_KEY = "dictate-target-language";

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

export default function Command() {
  const [targetLanguage, setTargetLanguage] = useState<string>("auto");

  useEffect(() => {
    // Load saved preference
    LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY).then((savedLang) => {
      if (savedLang) {
        setTargetLanguage(savedLang);
      }
    });
  }, []);

  const handleSubmit = async (values: { targetLanguage: string }) => {
    await LocalStorage.setItem(DICTATE_TARGET_LANG_KEY, values.targetLanguage);
    await showHUD("Dictation language preferences saved");
    await popToRoot();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preferences" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="targetLanguage"
        title="Default Target Language"
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
    </Form>
  );
}
