"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPERIMENTAL_MODE_KEY = exports.MUTE_DURING_DICTATION_KEY = exports.USE_PERSONAL_DICTIONARY_KEY = exports.SILENCE_THRESHOLD_KEY = exports.SILENCE_TIMEOUT_KEY = exports.FIX_TEXT_KEY = exports.LLM_MODEL_KEY = exports.SECONDARY_LANG_KEY = exports.PRIMARY_LANG_KEY = exports.PARAKEET_MODEL_KEY = exports.LOCAL_ENGINE_KEY = exports.TRANSCRIBE_MODEL_KEY = exports.WHISPER_MODEL_KEY = exports.WHISPER_MODE_KEY = exports.DICTATE_TARGET_LANG_KEY = void 0;
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const local_models_1 = require("./utils/local-models");
const constants_1 = require("./constants");
const dependencies_1 = require("./utils/dependencies");
exports.DICTATE_TARGET_LANG_KEY = "dictate-target-language";
exports.WHISPER_MODE_KEY = "whisper-mode";
exports.WHISPER_MODEL_KEY = "whisper-model";
exports.TRANSCRIBE_MODEL_KEY = "transcribe-model";
exports.LOCAL_ENGINE_KEY = "local-engine";
exports.PARAKEET_MODEL_KEY = "parakeet-model";
exports.PRIMARY_LANG_KEY = "primary-language";
exports.SECONDARY_LANG_KEY = "secondary-language";
exports.LLM_MODEL_KEY = "llm-model";
exports.FIX_TEXT_KEY = "fix-text";
exports.SILENCE_TIMEOUT_KEY = "silence-timeout";
exports.SILENCE_THRESHOLD_KEY = "silence-threshold";
exports.USE_PERSONAL_DICTIONARY_KEY = "use-personal-dictionary";
exports.MUTE_DURING_DICTATION_KEY = "mute-during-dictation";
exports.EXPERIMENTAL_MODE_KEY = "experimental-mode";
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
function Command() {
    const [targetLanguage, setTargetLanguage] = (0, react_1.useState)("auto");
    const [primaryLanguage, setPrimaryLanguage] = (0, react_1.useState)("en");
    const [secondaryLanguage, setSecondaryLanguage] = (0, react_1.useState)("fr");
    const [llmModel, setLlmModel] = (0, react_1.useState)("gpt-4o-mini");
    const [whisperMode, setWhisperMode] = (0, react_1.useState)("transcribe");
    const [localEngine, setLocalEngine] = (0, react_1.useState)("whisper");
    const [whisperModel, setWhisperModel] = (0, react_1.useState)("base");
    const [parakeetModel, setParakeetModel] = (0, react_1.useState)("parakeet-tdt-0.6b-v2");
    const [transcribeModel, setTranscribeModel] = (0, react_1.useState)("gpt-4o-mini-transcribe");
    const [fixText, setFixText] = (0, react_1.useState)(true);
    const [silenceTimeout, setSilenceTimeout] = (0, react_1.useState)("2.0");
    const [silenceThreshold, setSilenceThreshold] = (0, react_1.useState)("2");
    const [usePersonalDictionary, setUsePersonalDictionary] = (0, react_1.useState)(false);
    const [muteDuringDictation, setMuteDuringDictation] = (0, react_1.useState)(true);
    const [experimentalMode, setExperimentalMode] = (0, react_1.useState)(false);
    const [dependencyStatus, setDependencyStatus] = (0, react_1.useState)(null);
    const [isCheckingDependencies, setIsCheckingDependencies] = (0, react_1.useState)(false);
    const [isInstallingDependencies, setIsInstallingDependencies] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Load all saved preferences
        const loadSettings = async () => {
            const savedTargetLang = await api_1.LocalStorage.getItem(exports.DICTATE_TARGET_LANG_KEY);
            const savedPrimaryLang = await api_1.LocalStorage.getItem(exports.PRIMARY_LANG_KEY);
            const savedSecondaryLang = await api_1.LocalStorage.getItem(exports.SECONDARY_LANG_KEY);
            const savedWhisperMode = await api_1.LocalStorage.getItem(exports.WHISPER_MODE_KEY);
            const savedLocalEngine = await api_1.LocalStorage.getItem(exports.LOCAL_ENGINE_KEY);
            const savedWhisperModel = await api_1.LocalStorage.getItem(exports.WHISPER_MODEL_KEY);
            const savedParakeetModel = await api_1.LocalStorage.getItem(exports.PARAKEET_MODEL_KEY);
            const savedTranscribeModel = await api_1.LocalStorage.getItem(exports.TRANSCRIBE_MODEL_KEY);
            const savedLlmModel = await api_1.LocalStorage.getItem(exports.LLM_MODEL_KEY);
            const savedFixText = await api_1.LocalStorage.getItem(exports.FIX_TEXT_KEY);
            const savedSilenceTimeout = await api_1.LocalStorage.getItem(exports.SILENCE_TIMEOUT_KEY);
            const savedSilenceThreshold = await api_1.LocalStorage.getItem(exports.SILENCE_THRESHOLD_KEY);
            const savedUsePersonalDictionary = await api_1.LocalStorage.getItem(exports.USE_PERSONAL_DICTIONARY_KEY);
            const savedMuteDuringDictation = await api_1.LocalStorage.getItem(exports.MUTE_DURING_DICTATION_KEY);
            const savedExperimentalMode = await api_1.LocalStorage.getItem(exports.EXPERIMENTAL_MODE_KEY);
            // Update download status for each model
            WHISPER_MODEL_OPTIONS.forEach((model) => {
                model.isDownloaded = (0, local_models_1.isWhisperModelDownloaded)(model.value);
            });
            // Update Parakeet model status (async)
            for (const model of PARAKEET_MODEL_OPTIONS) {
                try {
                    model.isDownloaded = await (0, local_models_1.isParakeetModelDownloaded)(model.value);
                }
                catch {
                    model.isDownloaded = false;
                }
            }
            if (savedTargetLang)
                setTargetLanguage(savedTargetLang);
            if (savedPrimaryLang)
                setPrimaryLanguage(savedPrimaryLang);
            if (savedSecondaryLang)
                setSecondaryLanguage(savedSecondaryLang);
            if (savedWhisperMode)
                setWhisperMode(savedWhisperMode);
            if (savedLocalEngine)
                setLocalEngine(savedLocalEngine);
            if (savedWhisperModel)
                setWhisperModel(savedWhisperModel);
            if (savedParakeetModel)
                setParakeetModel(savedParakeetModel);
            if (savedTranscribeModel)
                setTranscribeModel(savedTranscribeModel);
            if (savedLlmModel)
                setLlmModel(savedLlmModel);
            if (savedFixText)
                setFixText(savedFixText === "true");
            if (savedSilenceTimeout)
                setSilenceTimeout(savedSilenceTimeout);
            if (savedSilenceThreshold)
                setSilenceThreshold(savedSilenceThreshold);
            if (savedUsePersonalDictionary)
                setUsePersonalDictionary(savedUsePersonalDictionary === "true");
            if (savedMuteDuringDictation !== null)
                setMuteDuringDictation(savedMuteDuringDictation === "true");
            if (savedExperimentalMode !== null)
                setExperimentalMode(savedExperimentalMode === "true");
        };
        loadSettings();
        checkDependenciesStatus();
    }, []);
    const handleSubmit = async () => {
        // Save all preferences using local state
        await Promise.all([
            api_1.LocalStorage.setItem(exports.DICTATE_TARGET_LANG_KEY, targetLanguage),
            api_1.LocalStorage.setItem(exports.PRIMARY_LANG_KEY, primaryLanguage),
            api_1.LocalStorage.setItem(exports.SECONDARY_LANG_KEY, secondaryLanguage),
            api_1.LocalStorage.setItem(exports.WHISPER_MODE_KEY, whisperMode),
            api_1.LocalStorage.setItem(exports.LOCAL_ENGINE_KEY, localEngine),
            api_1.LocalStorage.setItem(exports.WHISPER_MODEL_KEY, whisperModel),
            api_1.LocalStorage.setItem(exports.PARAKEET_MODEL_KEY, parakeetModel),
            api_1.LocalStorage.setItem(exports.TRANSCRIBE_MODEL_KEY, transcribeModel),
            api_1.LocalStorage.setItem(exports.LLM_MODEL_KEY, llmModel),
            api_1.LocalStorage.setItem(exports.FIX_TEXT_KEY, fixText.toString()),
            api_1.LocalStorage.setItem(exports.EXPERIMENTAL_MODE_KEY, experimentalMode.toString()),
            api_1.LocalStorage.setItem(exports.SILENCE_TIMEOUT_KEY, silenceTimeout),
            api_1.LocalStorage.setItem(exports.SILENCE_THRESHOLD_KEY, silenceThreshold),
            api_1.LocalStorage.setItem(exports.USE_PERSONAL_DICTIONARY_KEY, usePersonalDictionary.toString()),
            api_1.LocalStorage.setItem(exports.MUTE_DURING_DICTATION_KEY, muteDuringDictation.toString()),
        ]);
        await (0, api_1.showHUD)("Settings saved successfully");
        await (0, api_1.popToRoot)();
    };
    const checkDependenciesStatus = async () => {
        if (isCheckingDependencies)
            return;
        setIsCheckingDependencies(true);
        try {
            const status = await (0, dependencies_1.checkDependencies)();
            setDependencyStatus(status);
        }
        catch (error) {
            console.error("Error checking dependencies:", error);
        }
        finally {
            setIsCheckingDependencies(false);
        }
    };
    const handleInstallDependencies = async () => {
        if (isInstallingDependencies)
            return;
        setIsInstallingDependencies(true);
        try {
            await (0, dependencies_1.installAllMissingDependencies)();
            await checkDependenciesStatus(); // Refresh status after installation
        }
        catch (error) {
            console.error("Error installing dependencies:", error);
        }
        finally {
            setIsInstallingDependencies(false);
        }
    };
    const getDependencyStatusText = () => {
        if (isCheckingDependencies)
            return "Checking dependencies...";
        if (!dependencyStatus)
            return "Click 'Check Dependencies' to verify setup";
        if (dependencyStatus.allInstalled)
            return "✅ All required dependencies are installed";
        return `❌ Missing dependencies: ${dependencyStatus.missingRequired.join(", ")}`;
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Save Settings", onSubmit: handleSubmit }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Check Dependencies", icon: api_1.Icon.MagnifyingGlass, onAction: checkDependenciesStatus, shortcut: { modifiers: ["cmd"], key: "d" } }), dependencyStatus && !dependencyStatus.allInstalled && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: isInstallingDependencies ? "Installing…" : "Install Missing Dependencies", icon: api_1.Icon.Download, onAction: handleInstallDependencies, shortcut: { modifiers: ["cmd"], key: "i" } }))] }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Configure your AI Assistant preferences" }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Language Settings" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "primaryLanguage", title: "Primary Language", info: "Your main language for translations and AI interactions", value: primaryLanguage, onChange: setPrimaryLanguage, children: constants_1.LANGUAGE_OPTIONS.filter((lang) => lang.value !== "auto").map((lang) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: lang.value, title: lang.title }, lang.value))) }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "secondaryLanguage", title: "Secondary Language", info: "Your alternate language for translations", value: secondaryLanguage, onChange: setSecondaryLanguage, children: constants_1.LANGUAGE_OPTIONS.filter((lang) => lang.value !== "auto").map((lang) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: lang.value, title: lang.title }, lang.value))) }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "targetLanguage", title: "Default Output Language", info: "Language used as output after speech recognition", value: targetLanguage, onChange: setTargetLanguage, children: constants_1.LANGUAGE_OPTIONS.map((lang) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: lang.value, title: lang.title }, lang.value))) }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Speech Recognition Settings" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "whisperMode", title: "Speech Recognition Mode", info: "Choose between online (OpenAI API) or local processing", value: whisperMode, onChange: setWhisperMode, children: WHISPER_MODE_OPTIONS.map((mode) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: mode.value, title: mode.title }, mode.value))) }), whisperMode === "transcribe" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "transcribeModel", title: "Transcription Model", info: "Select the gpt-4o transcription model to use", value: transcribeModel, onChange: setTranscribeModel, children: TRANSCRIBE_MODEL_OPTIONS.map((model) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: model.value, title: model.title }, model.value))) }), (0, jsx_runtime_1.jsx)(api_1.Form.Checkbox, { id: "experimentalMode", title: "Experimental Mode", label: "Enable unified transcription with integrated dictionary and post-processing", value: experimentalMode, onChange: setExperimentalMode }), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "gpt-4o Transcribe models provide specialized speech-to-text capabilities with enhanced accuracy." })] })), whisperMode === "local" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "localEngine", title: "Local Engine", info: "Select the local speech recognition engine", value: localEngine, onChange: setLocalEngine, children: LOCAL_ENGINE_OPTIONS.map((engine) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: engine.value, title: `${engine.title} ${engine.value === "parakeet" && !(0, local_models_1.isAppleSiliconCompatible)() ? "(Not Compatible)" : ""}` }, engine.value))) }), localEngine === "whisper" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "whisperModel", title: "Whisper Model", info: "Select the local Whisper model to use", value: whisperModel, onChange: setWhisperModel, children: WHISPER_MODEL_OPTIONS.map((model) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: model.value, title: `${model.title} ${model.isDownloaded ? "✓" : "⚠️"}` }, model.value))) }), !WHISPER_MODEL_OPTIONS.find((model) => model.value === whisperModel)?.isDownloaded ? ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "\u26A0\uFE0F Models need to be downloaded before use. Use the 'Manage Local Models' command to download and manage models." })) : ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Selected model is downloaded and ready to use." }))] })), localEngine === "parakeet" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [!(0, local_models_1.isAppleSiliconCompatible)() && ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "\u274C Parakeet requires Apple Silicon (M-series) Mac. Please select Whisper engine instead." })), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "parakeetModel", title: "Parakeet Model", info: "Select the Parakeet model to use (Apple Silicon only)", value: parakeetModel, onChange: setParakeetModel, children: PARAKEET_MODEL_OPTIONS.map((model) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: model.value, title: `${model.title} ${model.isDownloaded ? "✓" : "⚠️"}` }, model.value))) }), !PARAKEET_MODEL_OPTIONS.find((model) => model.value === parakeetModel)?.isDownloaded ? ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "\u26A0\uFE0F Models need to be downloaded before use. Use the 'Manage Local Models' command to download and manage models." })) : ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Selected model is downloaded and ready to use. Ultra-fast transcription on Apple Silicon!" })), (0, local_models_1.isAppleSiliconCompatible)() && ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "\uD83D\uDCA1 Parakeet provides ultra-fast transcription optimized specifically for Apple Silicon. Up to 60x faster than Whisper!" }))] }))] })), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "AI Model Settings" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown, { id: "llmModel", title: "AI Model", info: "Select the AI model to use for all operations", value: llmModel, onChange: setLlmModel, children: MODEL_OPTIONS.map((model) => ((0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: model.value, title: model.title }, model.value))) }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Recording Settings" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "silenceTimeout", title: "Silence Timeout", placeholder: "2.0", info: "Number of seconds of silence before stopping recording (e.g. 2.0)", value: silenceTimeout, onChange: setSilenceTimeout }), (0, jsx_runtime_1.jsxs)(api_1.Form.Dropdown, { id: "silenceThreshold", title: "Silence Sensitivity", info: "How sensitive the silence detection is (0=very sensitive/1%, 10=less sensitive/6%)", value: silenceThreshold, onChange: setSilenceThreshold, children: [(0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "0", title: "0 - Very Sensitive (1%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "1", title: "1 - High (1.5%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "2", title: "2 - Balanced (2%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "3", title: "3 - Moderate (2.5%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "4", title: "4 - Standard (3%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "5", title: "5 - Medium (3.5%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "6", title: "6 - Tolerant (4%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "7", title: "7 - High Tolerance (4.5%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "8", title: "8 - Low Sensitivity (5%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "9", title: "9 - Very Low (5.5%)" }), (0, jsx_runtime_1.jsx)(api_1.Form.Dropdown.Item, { value: "10", title: "10 - Least Sensitive (6%)" })] }), (0, jsx_runtime_1.jsx)(api_1.Form.Checkbox, { id: "muteDuringDictation", label: "Mute system audio during dictation", title: "Mute During Dictation", info: "Automatically mute system audio output while recording", value: muteDuringDictation, onChange: setMuteDuringDictation }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Feature Settings" }), (0, jsx_runtime_1.jsx)(api_1.Form.Checkbox, { id: "fixText", label: "The AI Assistant will fix grammar and spelling during translations and text generation", title: "Improve Text Quality", info: "Automatically fix grammar and spelling during translations and text generation", value: fixText, onChange: setFixText }), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "Personal Dictionary Settings" }), (0, jsx_runtime_1.jsx)(api_1.Form.Checkbox, { id: "usePersonalDictionary", label: "Use personal dictionary for transcription", title: "Personal Dictionary", info: "Apply personal dictionary corrections during speech recognition", value: usePersonalDictionary, onChange: setUsePersonalDictionary }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "System Dependencies" }), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: getDependencyStatusText() }), dependencyStatus && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [dependencyStatus.dependencies.map((dep) => ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: `${dep.isInstalled ? "    ✅ " + dep.name : "    ❌ " + dep.name}: ${dep.description}` }, dep.name))), !dependencyStatus.allInstalled && ((0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "\uD83D\uDCA1 Click 'Install Missing Dependencies' to automatically install all required dependencies via Homebrew." }))] }))] }));
}
