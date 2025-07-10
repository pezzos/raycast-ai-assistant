"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const local_models_1 = require("./utils/local-models");
function Command() {
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [engineStatus, setEngineStatus] = (0, react_1.useState)({ whisper: false, parakeet: false });
    const [models, setModels] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        loadModels();
    }, []);
    async function loadModels() {
        setIsLoading(true);
        console.log("=== Starting loadModels function ===");
        try {
            console.log("Step 1: Checking Whisper binary...");
            const whisperCheckStart = Date.now();
            const whisperInstalled = await Promise.race([
                (0, local_models_1.isWhisperBinaryWorking)(),
                new Promise((resolve) => setTimeout(() => {
                    console.log("Whisper check timed out after 3s");
                    resolve(false);
                }, 3000)),
            ]);
            console.log(`Whisper check completed in ${Date.now() - whisperCheckStart}ms:`, whisperInstalled);
            console.log("Step 2: Checking Parakeet installation...");
            const parakeetCheckStart = Date.now();
            const parakeetInstalled = await Promise.race([
                (0, local_models_1.isParakeetInstalled)(),
                new Promise((resolve) => setTimeout(() => {
                    console.log("Parakeet check timed out after 3s");
                    resolve(false);
                }, 3000)),
            ]);
            console.log(`Parakeet check completed in ${Date.now() - parakeetCheckStart}ms:`, parakeetInstalled);
            setEngineStatus({ whisper: whisperInstalled, parakeet: parakeetInstalled });
            console.log("Step 3: Getting available models...");
            const modelsStart = Date.now();
            // Load models with shorter timeout to prevent hanging
            const availableModels = await Promise.race([
                (0, local_models_1.getAvailableLocalModels)(),
                new Promise((_, reject) => setTimeout(() => {
                    console.log("Model loading timed out after 5s");
                    reject(new Error("Timeout loading models"));
                }, 5000)),
            ]);
            console.log(`Models loaded in ${Date.now() - modelsStart}ms:`, availableModels.length);
            setModels(availableModels);
            console.log("=== loadModels completed successfully ===");
        }
        catch (error) {
            console.error("Error loading models:", error);
            // Set empty models on error to prevent infinite loading
            setModels([]);
            console.log("=== loadModels completed with error ===");
        }
        finally {
            setIsLoading(false);
        }
    }
    async function handleInstallWhisper() {
        try {
            await (0, local_models_1.installWhisper)();
            await loadModels();
        }
        catch (error) {
            console.error("Error installing Whisper:", error);
            await (0, api_1.showHUD)("❌ Failed to install Whisper");
        }
    }
    async function handleInstallParakeet() {
        try {
            await (0, local_models_1.installParakeet)();
            await loadModels();
        }
        catch (error) {
            console.error("Error installing Parakeet:", error);
            await (0, api_1.showHUD)("❌ Failed to install Parakeet");
        }
    }
    async function handleDownloadModel(engine, modelId) {
        try {
            if (engine === "whisper") {
                await (0, local_models_1.downloadWhisperModel)(modelId);
            }
            else if (engine === "parakeet") {
                await (0, local_models_1.downloadParakeetModel)(modelId);
            }
            await loadModels();
        }
        catch (error) {
            console.error("Error downloading model:", error);
            await (0, api_1.showHUD)(`❌ Failed to download ${modelId} model`);
        }
    }
    async function handleCleanup() {
        try {
            await (0, local_models_1.cleanupLocalModels)();
            await loadModels();
        }
        catch (error) {
            console.error("Error cleaning up local models:", error);
            await (0, api_1.showHUD)("❌ Failed to clean up local model files");
        }
    }
    const noEnginesInstalled = !engineStatus.whisper && !engineStatus.parakeet;
    if (noEnginesInstalled) {
        return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, children: (0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No Local Engines Installed", description: "Install Whisper or Parakeet to use offline speech recognition.", actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Install Engines", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Install Whisper", onAction: handleInstallWhisper, icon: api_1.Icon.Download }), (0, local_models_1.isAppleSiliconCompatible)() && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: "Install Parakeet (apple Silicon)", onAction: handleInstallParakeet, icon: api_1.Icon.Download }))] }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Clean up All Local Files", onAction: handleCleanup, icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["opt", "cmd"], key: "backspace" } }) })] }) }) }));
    }
    const getCompatibilityStatus = (model) => {
        if (!model.isCompatible)
            return "❌ Not Compatible";
        if (model.isInstalled)
            return "✅ Downloaded";
        return "⬇️ Available";
    };
    const whisperModels = models.filter((m) => m.engine === "whisper");
    const parakeetModels = models.filter((m) => m.engine === "parakeet");
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { isLoading: isLoading, children: [!engineStatus.whisper && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Install Whisper Engine", children: (0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "\uD83E\uDD16 Whisper Engine", subtitle: "Universal compatibility, multiple model sizes", accessories: [{ text: "Not Installed", icon: api_1.Icon.Download }], actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Install Whisper", onAction: handleInstallWhisper, icon: api_1.Icon.Download }) }) }) })), !engineStatus.parakeet && (0, local_models_1.isAppleSiliconCompatible)() && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Install Parakeet Engine", children: (0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "\uD83E\uDD9C Parakeet Engine", subtitle: "Apple Silicon optimized, ultra-fast transcription (60x faster)", accessories: [{ text: "Not Installed", icon: api_1.Icon.Download }], actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Install Parakeet", onAction: handleInstallParakeet, icon: api_1.Icon.Download }) }) }) })), engineStatus.whisper && whisperModels.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "\uD83E\uDD16 Whisper Models", children: whisperModels.map((model) => {
                    const modelId = model.id.replace("whisper-", "");
                    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: model.name, subtitle: model.description, accessories: [
                            {
                                text: getCompatibilityStatus(model),
                                icon: model.isInstalled ? api_1.Icon.Checkmark : api_1.Icon.Download,
                            },
                        ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: !model.isInstalled && model.isCompatible && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `Download ${model.name}`, onAction: () => handleDownloadModel("whisper", modelId), icon: api_1.Icon.Download })) }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Clean up All Local Files", onAction: handleCleanup, icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["opt", "cmd"], key: "backspace" } }) })] }) }, model.id));
                }) })), engineStatus.parakeet && parakeetModels.length > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "\uD83E\uDD9C Parakeet Models", children: parakeetModels.map((model) => {
                    const modelId = model.id.replace("parakeet-", "");
                    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: model.name, subtitle: `${model.description}${model.requirements ? ` • ${model.requirements}` : ""}`, accessories: [
                            {
                                text: getCompatibilityStatus(model),
                                icon: model.isInstalled ? api_1.Icon.Checkmark : model.isCompatible ? api_1.Icon.Download : api_1.Icon.XMarkCircle,
                            },
                        ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: !model.isInstalled && model.isCompatible && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `Download ${model.name}`, onAction: () => handleDownloadModel("parakeet", modelId), icon: api_1.Icon.Download })) }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Clean up All Local Files", onAction: handleCleanup, icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["opt", "cmd"], key: "backspace" } }) })] }) }, model.id));
                }) })), (engineStatus.whisper || engineStatus.parakeet) && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "System Info", children: (0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Apple Silicon Status", subtitle: (0, local_models_1.isAppleSiliconCompatible)() ? "Compatible with Parakeet" : "Parakeet requires Apple Silicon", accessories: [
                        {
                            text: (0, local_models_1.isAppleSiliconCompatible)() ? "Compatible" : "Intel Mac",
                            icon: (0, local_models_1.isAppleSiliconCompatible)() ? api_1.Icon.Checkmark : api_1.Icon.XMarkCircle,
                        },
                    ] }) }))] }));
}
