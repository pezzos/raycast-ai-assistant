import { Action, ActionPanel, Form, LocalStorage, popToRoot, showHUD, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { isWhisperModelDownloaded, isParakeetModelDownloaded, isAppleSiliconCompatible } from "./utils/local-models";
import { LANGUAGE_OPTIONS } from "./constants";
import { checkDependencies, installAllMissingDependencies, DependencyCheckResult } from "./utils/dependencies";

export const DICTATE_TARGET_LANG_KEY = "dictate-target-language";
export const WHISPER_MODE_KEY = "whisper-mode";
export const WHISPER_MODEL_KEY = "whisper-model";
export const TRANSCRIBE_MODEL_KEY = "transcribe-model";
export const LOCAL_ENGINE_KEY = "local-engine";
export const PARAKEET_MODEL_KEY = "parakeet-model";
export const PRIMARY_LANG_KEY = "primary-language";
export const SECONDARY_LANG_KEY = "secondary-language";
export const LLM_MODEL_KEY = "llm-model";
export const FIX_TEXT_KEY = "fix-text";
export const SILENCE_THRESHOLD_KEY = "silence-threshold";
export const USE_PERSONAL_DICTIONARY_KEY = "use-personal-dictionary";
export const MUTE_DURING_DICTATION_KEY = "mute-during-dictation";
export const EXPERIMENTAL_MODE_KEY = "experimental-mode";

const WHISPER_MODE_OPTIONS = [
  { value: "transcribe", title: "Online (gpt-4o Transcribe)" },
  { value: "local", title: "Local (Offline)" },
];

const LOCAL_ENGINE_OPTIONS = [
  { value: "whisper", title: "Whisper (Universal)" },
  { value: "parakeet", title: "Parakeet (Apple Silicon Only, Ultra Fast)" },
];

const WHISPER_MODEL_OPTIONS = [
  { value: "tiny", title: "Tiny (Fast, Less Accurate)", isDownloaded: false },
  { value: "base", title: "Base (Balanced)", isDownloaded: false },
  { value: "small", title: "Small (More Accurate)", isDownloaded: false },
  { value: "medium", title: "Medium (Most Accurate)", isDownloaded: false },
];

const PARAKEET_MODEL_OPTIONS = [
  {
    value: "parakeet-tdt-0.6b-v2",
    title: "Parakeet TDT 0.6B v2 (600M params, Fast, English only)",
    isDownloaded: false,
  },
  {
    value: "parakeet-rnnt-1.1b",
    title: "Parakeet RNNT 1.1B (1100M params, Higher accuracy, English only)",
    isDownloaded: false,
  },
];

const TRANSCRIBE_MODEL_OPTIONS = [
  { value: "gpt-4o-transcribe", title: "gpt-4o Transcribe (Most Capable)" },
  { value: "gpt-4o-mini-transcribe", title: "gpt-4o Mini Transcribe (Fast & Efficient)" },
];

const MODEL_OPTIONS = [
  { value: "gpt-4o", title: "GPT-4o (Most Capable)" },
  { value: "gpt-4o-mini", title: "GPT-4o Mini (Fastest/Recommended)" },
  { value: "gpt-4.1-nano", title: "GPT-4.1 Nano (Ultra Fast)" },
  { value: "gpt-4.1-mini", title: "GPT-4.1 Mini (Fast & Efficient)" },
  { value: "o1", title: "o1 (Most Powerful reasoning model)" },
  { value: "o1-mini", title: "o1-mini (Smaller reasoning model)" },
];

export default function Command() {
  const [targetLanguage, setTargetLanguage] = useState<string>("auto");
  const [primaryLanguage, setPrimaryLanguage] = useState<string>("en");
  const [secondaryLanguage, setSecondaryLanguage] = useState<string>("fr");
  const [llmModel, setLlmModel] = useState<string>("gpt-4o-mini");
  const [whisperMode, setWhisperMode] = useState<string>("transcribe");
  const [localEngine, setLocalEngine] = useState<string>("whisper");
  const [whisperModel, setWhisperModel] = useState<string>("base");
  const [parakeetModel, setParakeetModel] = useState<string>("parakeet-tdt-0.6b-v2");
  const [transcribeModel, setTranscribeModel] = useState<string>("gpt-4o-mini-transcribe");
  const [fixText, setFixText] = useState<boolean>(true);
  const [silenceThreshold, setSilenceThreshold] = useState<string>("2");
  const [usePersonalDictionary, setUsePersonalDictionary] = useState<boolean>(false);
  const [muteDuringDictation, setMuteDuringDictation] = useState<boolean>(true);
  const [experimentalMode, setExperimentalMode] = useState<boolean>(false);
  const [dependencyStatus, setDependencyStatus] = useState<DependencyCheckResult | null>(null);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState<boolean>(false);
  const [isInstallingDependencies, setIsInstallingDependencies] = useState<boolean>(false);

  useEffect(() => {
    // Load all saved preferences
    const loadSettings = async () => {
      const savedTargetLang = await LocalStorage.getItem<string>(DICTATE_TARGET_LANG_KEY);
      const savedPrimaryLang = await LocalStorage.getItem<string>(PRIMARY_LANG_KEY);
      const savedSecondaryLang = await LocalStorage.getItem<string>(SECONDARY_LANG_KEY);
      const savedWhisperMode = await LocalStorage.getItem<string>(WHISPER_MODE_KEY);
      const savedLocalEngine = await LocalStorage.getItem<string>(LOCAL_ENGINE_KEY);
      const savedWhisperModel = await LocalStorage.getItem<string>(WHISPER_MODEL_KEY);
      const savedParakeetModel = await LocalStorage.getItem<string>(PARAKEET_MODEL_KEY);
      const savedTranscribeModel = await LocalStorage.getItem<string>(TRANSCRIBE_MODEL_KEY);
      const savedLlmModel = await LocalStorage.getItem<string>(LLM_MODEL_KEY);
      const savedFixText = await LocalStorage.getItem<string>(FIX_TEXT_KEY);
      const savedSilenceThreshold = await LocalStorage.getItem<string>(SILENCE_THRESHOLD_KEY);
      const savedUsePersonalDictionary = await LocalStorage.getItem<string>(USE_PERSONAL_DICTIONARY_KEY);
      const savedMuteDuringDictation = await LocalStorage.getItem<string>(MUTE_DURING_DICTATION_KEY);
      const savedExperimentalMode = await LocalStorage.getItem<string>(EXPERIMENTAL_MODE_KEY);

      // Update download status for each model
      WHISPER_MODEL_OPTIONS.forEach((model) => {
        model.isDownloaded = isWhisperModelDownloaded(model.value);
      });

      // Update Parakeet model status (async)
      for (const model of PARAKEET_MODEL_OPTIONS) {
        try {
          model.isDownloaded = await isParakeetModelDownloaded(model.value);
        } catch {
          model.isDownloaded = false;
        }
      }

      if (savedTargetLang) setTargetLanguage(savedTargetLang);
      if (savedPrimaryLang) setPrimaryLanguage(savedPrimaryLang);
      if (savedSecondaryLang) setSecondaryLanguage(savedSecondaryLang);
      if (savedWhisperMode) setWhisperMode(savedWhisperMode);
      if (savedLocalEngine) setLocalEngine(savedLocalEngine);
      if (savedWhisperModel) setWhisperModel(savedWhisperModel);
      if (savedParakeetModel) setParakeetModel(savedParakeetModel);
      if (savedTranscribeModel) setTranscribeModel(savedTranscribeModel);
      if (savedLlmModel) setLlmModel(savedLlmModel);
      if (savedFixText) setFixText(savedFixText === "true");
      if (savedSilenceThreshold) setSilenceThreshold(savedSilenceThreshold);
      if (savedUsePersonalDictionary) setUsePersonalDictionary(savedUsePersonalDictionary === "true");
      if (savedMuteDuringDictation !== null) setMuteDuringDictation(savedMuteDuringDictation === "true");
      if (savedExperimentalMode !== null) setExperimentalMode(savedExperimentalMode === "true");
    };

    loadSettings();
    checkDependenciesStatus();
  }, []);

  const handleSubmit = async () => {
    // Save all preferences using local state
    await Promise.all([
      LocalStorage.setItem(DICTATE_TARGET_LANG_KEY, targetLanguage),
      LocalStorage.setItem(PRIMARY_LANG_KEY, primaryLanguage),
      LocalStorage.setItem(SECONDARY_LANG_KEY, secondaryLanguage),
      LocalStorage.setItem(WHISPER_MODE_KEY, whisperMode),
      LocalStorage.setItem(LOCAL_ENGINE_KEY, localEngine),
      LocalStorage.setItem(WHISPER_MODEL_KEY, whisperModel),
      LocalStorage.setItem(PARAKEET_MODEL_KEY, parakeetModel),
      LocalStorage.setItem(TRANSCRIBE_MODEL_KEY, transcribeModel),
      LocalStorage.setItem(LLM_MODEL_KEY, llmModel),
      LocalStorage.setItem(FIX_TEXT_KEY, fixText.toString()),
      LocalStorage.setItem(EXPERIMENTAL_MODE_KEY, experimentalMode.toString()),
      LocalStorage.setItem(SILENCE_THRESHOLD_KEY, silenceThreshold),
      LocalStorage.setItem(USE_PERSONAL_DICTIONARY_KEY, usePersonalDictionary.toString()),
      LocalStorage.setItem(MUTE_DURING_DICTATION_KEY, muteDuringDictation.toString()),
    ]);

    await showHUD("Settings saved successfully");
    await popToRoot();
  };

  const checkDependenciesStatus = async () => {
    if (isCheckingDependencies) return;
    
    setIsCheckingDependencies(true);
    try {
      const status = await checkDependencies();
      setDependencyStatus(status);
    } catch (error) {
      console.error("Error checking dependencies:", error);
    } finally {
      setIsCheckingDependencies(false);
    }
  };

  const handleInstallDependencies = async () => {
    if (isInstallingDependencies) return;
    
    setIsInstallingDependencies(true);
    try {
      await installAllMissingDependencies();
      await checkDependenciesStatus(); // Refresh status after installation
    } catch (error) {
      console.error("Error installing dependencies:", error);
    } finally {
      setIsInstallingDependencies(false);
    }
  };


  const getDependencyStatusText = () => {
    if (isCheckingDependencies) return "Checking dependencies...";
    if (!dependencyStatus) return "Click 'Check Dependencies' to verify setup";
    if (dependencyStatus.allInstalled) return "✅ All required dependencies are installed";
    return `❌ Missing dependencies: ${dependencyStatus.missingRequired.join(", ")}`;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
          <Action
            title="Check Dependencies"
            icon={Icon.MagnifyingGlass}
            onAction={checkDependenciesStatus}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {dependencyStatus && !dependencyStatus.allInstalled && (
            <Action
              title={isInstallingDependencies ? "Installing..." : "Install Missing Dependencies"}
              icon={Icon.Download}
              onAction={handleInstallDependencies}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
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
        {LANGUAGE_OPTIONS.filter((lang) => lang.value !== "auto").map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="secondaryLanguage"
        title="Secondary Language"
        info="Your alternate language for translations"
        value={secondaryLanguage}
        onChange={setSecondaryLanguage}
      >
        {LANGUAGE_OPTIONS.filter((lang) => lang.value !== "auto").map((lang) => (
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
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
          <Form.Dropdown.Item key={lang.value} value={lang.value} title={lang.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Speech Recognition Settings" />

      <Form.Dropdown
        id="whisperMode"
        title="Speech Recognition Mode"
        info="Choose between online (OpenAI API) or local processing"
        value={whisperMode}
        onChange={setWhisperMode}
      >
        {WHISPER_MODE_OPTIONS.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.title} />
        ))}
      </Form.Dropdown>

      {whisperMode === "transcribe" && (
        <>
          <Form.Dropdown
            id="transcribeModel"
            title="Transcription Model"
            info="Select the gpt-4o transcription model to use"
            value={transcribeModel}
            onChange={setTranscribeModel}
          >
            {TRANSCRIBE_MODEL_OPTIONS.map((model) => (
              <Form.Dropdown.Item key={model.value} value={model.value} title={model.title} />
            ))}
          </Form.Dropdown>

          <Form.Checkbox
            id="experimentalMode"
            title="Experimental Mode"
            label="Enable unified transcription with integrated dictionary and post-processing"
            value={experimentalMode}
            onChange={setExperimentalMode}
          />

          <Form.Description text="gpt-4o Transcribe models provide specialized speech-to-text capabilities with enhanced accuracy." />
        </>
      )}

      {whisperMode === "local" && (
        <>
          <Form.Dropdown
            id="localEngine"
            title="Local Engine"
            info="Select the local speech recognition engine"
            value={localEngine}
            onChange={setLocalEngine}
          >
            {LOCAL_ENGINE_OPTIONS.map((engine) => (
              <Form.Dropdown.Item
                key={engine.value}
                value={engine.value}
                title={`${engine.title} ${engine.value === "parakeet" && !isAppleSiliconCompatible() ? "(Not Compatible)" : ""}`}
              />
            ))}
          </Form.Dropdown>

          {localEngine === "whisper" && (
            <>
              <Form.Dropdown
                id="whisperModel"
                title="Whisper Model"
                info="Select the local Whisper model to use"
                value={whisperModel}
                onChange={setWhisperModel}
              >
                {WHISPER_MODEL_OPTIONS.map((model) => (
                  <Form.Dropdown.Item
                    key={model.value}
                    value={model.value}
                    title={`${model.title} ${model.isDownloaded ? "✓" : "⚠️"}`}
                  />
                ))}
              </Form.Dropdown>
              {!WHISPER_MODEL_OPTIONS.find((model) => model.value === whisperModel)?.isDownloaded ? (
                <Form.Description text="⚠️ Models need to be downloaded before use. Use the 'Manage Local Models' command to download and manage models." />
              ) : (
                <Form.Description text="Selected model is downloaded and ready to use." />
              )}
            </>
          )}

          {localEngine === "parakeet" && (
            <>
              {!isAppleSiliconCompatible() && (
                <Form.Description text="❌ Parakeet requires Apple Silicon (M-series) Mac. Please select Whisper engine instead." />
              )}
              <Form.Dropdown
                id="parakeetModel"
                title="Parakeet Model"
                info="Select the Parakeet model to use (Apple Silicon only)"
                value={parakeetModel}
                onChange={setParakeetModel}
              >
                {PARAKEET_MODEL_OPTIONS.map((model) => (
                  <Form.Dropdown.Item
                    key={model.value}
                    value={model.value}
                    title={`${model.title} ${model.isDownloaded ? "✓" : "⚠️"}`}
                  />
                ))}
              </Form.Dropdown>
              {!PARAKEET_MODEL_OPTIONS.find((model) => model.value === parakeetModel)?.isDownloaded ? (
                <Form.Description text="⚠️ Models need to be downloaded before use. Use the 'Manage Local Models' command to download and manage models." />
              ) : (
                <Form.Description text="Selected model is downloaded and ready to use. Ultra-fast transcription on Apple Silicon!" />
              )}
              {isAppleSiliconCompatible() && (
                <Form.Description text="💡 Parakeet provides ultra-fast transcription optimized specifically for Apple Silicon. Up to 60x faster than Whisper!" />
              )}
            </>
          )}
        </>
      )}

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
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Recording Settings" />

      <Form.Dropdown
        id="silenceThreshold"
        title="Silence Sensitivity"
        info="How sensitive the silence detection is (0=very sensitive/1%, 10=less sensitive/6%)"
        value={silenceThreshold}
        onChange={setSilenceThreshold}
      >
        <Form.Dropdown.Item value="0" title="0 - Very Sensitive (1%)" />
        <Form.Dropdown.Item value="1" title="1 - High (1.5%)" />
        <Form.Dropdown.Item value="2" title="2 - Balanced (2%)" />
        <Form.Dropdown.Item value="3" title="3 - Moderate (2.5%)" />
        <Form.Dropdown.Item value="4" title="4 - Standard (3%)" />
        <Form.Dropdown.Item value="5" title="5 - Medium (3.5%)" />
        <Form.Dropdown.Item value="6" title="6 - Tolerant (4%)" />
        <Form.Dropdown.Item value="7" title="7 - High Tolerance (4.5%)" />
        <Form.Dropdown.Item value="8" title="8 - Low Sensitivity (5%)" />
        <Form.Dropdown.Item value="9" title="9 - Very Low (5.5%)" />
        <Form.Dropdown.Item value="10" title="10 - Least Sensitive (6%)" />
      </Form.Dropdown>

      <Form.Checkbox
        id="muteDuringDictation"
        label="Mute system audio during dictation"
        title="Mute During Dictation"
        info="Automatically mute system audio output while recording"
        value={muteDuringDictation}
        onChange={setMuteDuringDictation}
      />

      <Form.Separator />

      <Form.Description text="Feature Settings" />

      <Form.Checkbox
        id="fixText"
        label="The AI Assistant will fix grammar and spelling during translations and text generation"
        title="Improve Text Quality"
        info="Automatically fix grammar and spelling during translations and text generation"
        value={fixText}
        onChange={setFixText}
      />

      <Form.Description text="Personal Dictionary Settings" />

      <Form.Checkbox
        id="usePersonalDictionary"
        label="Use personal dictionary for transcription"
        title="Personal Dictionary"
        info="Apply personal dictionary corrections during speech recognition"
        value={usePersonalDictionary}
        onChange={setUsePersonalDictionary}
      />

      <Form.Separator />

      <Form.Description text="System Dependencies" />
      
      <Form.Description text={getDependencyStatusText()} />
      
      {dependencyStatus && (
        <>
          {dependencyStatus.dependencies.map((dep) => (
            <Form.Description 
              key={dep.name}
              text={`${dep.isInstalled ? "    ✅ " + dep.name : "    ❌ " + dep.name}: ${dep.description}`}
            />
          ))}
          
          {!dependencyStatus.allInstalled && (
            <Form.Description text="💡 Click 'Install Missing Dependencies' to automatically install all required dependencies via Homebrew." />
          )}
        </>
      )}
    </Form>
  );
}
