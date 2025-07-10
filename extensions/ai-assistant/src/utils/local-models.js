"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableModels = exports.getDownloadedModels = exports.legacyIsModelDownloaded = exports.cleanupWhisper = exports.downloadModel = exports.isWhisperBinaryWorking = exports.isParakeetInstalled = void 0;
exports.clearModelCache = clearModelCache;
exports.isAppleSiliconCompatible = isAppleSiliconCompatible;
exports.isWhisperInstalled = isWhisperInstalled;
exports.isWhisperModelDownloaded = isWhisperModelDownloaded;
exports.isParakeetModelDownloaded = isParakeetModelDownloaded;
exports.isModelDownloaded = isModelDownloaded;
exports.installParakeet = installParakeet;
exports.installWhisper = installWhisper;
exports.downloadWhisperModel = downloadWhisperModel;
exports.downloadParakeetModel = downloadParakeetModel;
exports.cleanupLocalModels = cleanupLocalModels;
exports.getAvailableLocalModels = getAvailableLocalModels;
exports.transcribeWithParakeet = transcribeWithParakeet;
exports.transcribeWithWhisper = transcribeWithWhisper;
exports.transcribeAudio = transcribeAudio;
exports.isLocalTranscriptionAvailable = isLocalTranscriptionAvailable;
const api_1 = require("@raycast/api");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Persistent session cache - only cleared when settings change
const sessionCache = new Map();
function getCacheKey(operation, ...args) {
    return `${operation}:${JSON.stringify(args)}`;
}
/**
 * Clear the session cache - call when user changes settings
 */
function clearModelCache() {
    sessionCache.clear();
    console.log("Model verification cache cleared");
}
function memoize(fn, operation) {
    return async (...args) => {
        const key = getCacheKey(operation, ...args);
        const cached = sessionCache.get(key);
        if (cached !== undefined) {
            console.log(`Using cached result for ${operation}:`, args);
            return cached;
        }
        const result = await fn(...args);
        sessionCache.set(key, result);
        console.log(`Cached new result for ${operation}:`, args);
        return result;
    };
}
// System requirements check
const isAppleSilicon = process.arch === "arm64";
// Homebrew binary paths (FFMPEG removed since we use direct sox recording)
const FFPROBE_PATH = "/opt/homebrew/bin/ffprobe";
// Whisper configuration
const WHISPER_MODELS = {
    tiny: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    base: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    small: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    medium: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
};
const WHISPER_SOURCE_URL = "https://github.com/ggerganov/whisper.cpp/archive/refs/tags/v1.5.4.tar.gz";
const WHISPER_DIR = path_1.default.join(os_1.default.homedir(), ".raycast-whisper");
const WHISPER_MODELS_DIR = path_1.default.join(WHISPER_DIR, "models");
const WHISPER_BIN_DIR = path_1.default.join(WHISPER_DIR, "bin");
const WHISPER_SRC_DIR = path_1.default.join(WHISPER_DIR, "src");
// Parakeet configuration
const PARAKEET_MODELS = {
    "parakeet-tdt-0.6b-v2": {
        name: "Parakeet TDT 0.6B v2",
        description: "600M params, optimized for Apple Silicon, 6.05% WER - English only",
        huggingFaceId: "mlx-community/parakeet-tdt-0.6b-v2",
        requirements: "2GB+ unified memory, Apple Silicon",
        languages: ["en"], // English only
    },
    "parakeet-rnnt-1.1b": {
        name: "Parakeet RNNT 1.1B",
        description: "1.1B params, higher accuracy, FastConformer-RNNT - English only",
        huggingFaceId: "mlx-community/parakeet-rnnt-1.1b",
        requirements: "4GB+ unified memory, Apple Silicon",
        languages: ["en"], // English only for now
    },
    // Future multilingual model (when available in MLX format)
    // "parakeet-rnnt-1.1b-multilingual": {
    //   name: "Parakeet RNNT 1.1B Multilingual",
    //   description: "1.1B params, 25 languages including French, Spanish, German",
    //   huggingFaceId: "mlx-community/parakeet-rnnt-1.1b-multilingual", // Not yet available
    //   requirements: "4GB+ unified memory, Apple Silicon",
    //   languages: ["en", "fr", "es", "de", "it", "pt", "ru", "ja", "ko", "hi", "ar", "nl", "da", "no", "cs", "pl", "sv", "th", "tr", "he"],
    // },
};
/**
 * Show a system notification using osascript
 */
async function showSystemNotification(title, message) {
    const script = `
    display notification "${message}" with title "${title}"
  `;
    await execAsync(`osascript -e '${script}'`);
}
/**
 * Ensure all necessary directories exist
 */
async function ensureDirectories() {
    if (!fs_1.default.existsSync(WHISPER_DIR)) {
        fs_1.default.mkdirSync(WHISPER_DIR);
    }
    if (!fs_1.default.existsSync(WHISPER_MODELS_DIR)) {
        fs_1.default.mkdirSync(WHISPER_MODELS_DIR);
    }
    if (!fs_1.default.existsSync(WHISPER_BIN_DIR)) {
        fs_1.default.mkdirSync(WHISPER_BIN_DIR);
    }
}
/**
 * Check if system meets requirements for Apple Silicon models
 */
function isAppleSiliconCompatible() {
    return isAppleSilicon;
}
/**
 * Check if Whisper is installed locally
 */
function isWhisperInstalled() {
    const whisperPath = path_1.default.join(WHISPER_BIN_DIR, "whisper");
    return fs_1.default.existsSync(whisperPath);
}
/**
 * Find uv binary location (with timeout and path checking optimization)
 */
const findUvBinary = memoize(async () => {
    // Common locations for uv (check synchronously first for speed)
    const commonPaths = [`${os_1.default.homedir()}/.local/bin/uv`, "/usr/local/bin/uv", "/opt/homebrew/bin/uv"];
    // Check common paths first (fast synchronous check)
    for (const uvPath of commonPaths) {
        try {
            if (fs_1.default.existsSync(uvPath)) {
                return uvPath;
            }
        }
        catch {
            // Ignore errors from individual path checks
        }
    }
    // Try to find uv using which command with timeout
    try {
        return await Promise.race([
            (async () => {
                try {
                    const { stdout } = await execAsync("which uv");
                    const uvPath = stdout.trim();
                    if (uvPath && fs_1.default.existsSync(uvPath)) {
                        return uvPath;
                    }
                }
                catch {
                    // which command failed
                }
                return null;
            })(),
            new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
        ]);
    }
    catch {
        return null;
    }
}, "findUvBinary");
/**
 * Check if Parakeet is installed via uv (with timeout to prevent hanging)
 */
exports.isParakeetInstalled = memoize(async () => {
    try {
        // Add timeout to prevent hanging
        return await Promise.race([
            (async () => {
                const uvPath = await findUvBinary();
                if (!uvPath) {
                    return false;
                }
                try {
                    // First check if parakeet-mlx is installed as a uv tool
                    await execAsync(`"${uvPath}" tool list | grep parakeet-mlx`);
                    return true;
                }
                catch {
                    try {
                        // Try running parakeet-mlx via uv tool run
                        await execAsync(`"${uvPath}" tool run --from parakeet-mlx parakeet-mlx --help`);
                        return true;
                    }
                    catch {
                        return false;
                    }
                }
            })(),
            new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
        ]);
    }
    catch {
        return false;
    }
}, "isParakeetInstalled");
/**
 * Check if a specific Whisper model is downloaded
 */
function isWhisperModelDownloaded(model) {
    const modelPath = path_1.default.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);
    return fs_1.default.existsSync(modelPath);
}
/**
 * Check if a specific Parakeet model is downloaded
 * Since Parakeet downloads models automatically on first use, we check if the CLI works
 */
async function isParakeetModelDownloaded(modelId) {
    try {
        const model = PARAKEET_MODELS[modelId];
        if (!model)
            return false;
        // For Parakeet, if the CLI is available and working, the model is considered available
        // because Parakeet automatically downloads models on first use
        const isInstalled = await (0, exports.isParakeetInstalled)();
        console.log(`Parakeet model ${modelId} check: CLI installed=${isInstalled}`);
        return isInstalled;
    }
    catch (error) {
        console.warn(`Error checking Parakeet model ${modelId}:`, error);
        return false;
    }
}
/**
 * Check if a model is downloaded (unified interface)
 */
async function isModelDownloaded(engine, modelId) {
    if (engine === "whisper") {
        return isWhisperModelDownloaded(modelId);
    }
    else if (engine === "parakeet") {
        return await isParakeetModelDownloaded(modelId);
    }
    return false;
}
/**
 * Check if Whisper binary is properly installed and working
 */
exports.isWhisperBinaryWorking = memoize(async () => {
    const whisperPath = path_1.default.join(WHISPER_BIN_DIR, "whisper");
    if (!fs_1.default.existsSync(whisperPath)) {
        console.log("Binary not found at:", whisperPath);
        return false;
    }
    try {
        const stats = fs_1.default.statSync(whisperPath);
        const isExecutable = (stats.mode & fs_1.default.constants.S_IXUSR) !== 0;
        if (!isExecutable) {
            console.log("Binary is not executable");
            return false;
        }
        const { stdout, stderr } = await execAsync(`${whisperPath} --help`);
        console.log("Whisper help output:", stdout);
        console.log("Whisper help stderr:", stderr);
        return true;
    }
    catch (error) {
        console.error("Error checking whisper binary:", error);
        return false;
    }
}, "isWhisperBinaryWorking");
/**
 * Install Parakeet via uv tool
 */
async function installParakeet() {
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: "Installing Parakeet",
        message: "Checking system compatibility...",
    });
    try {
        if (!isAppleSiliconCompatible()) {
            throw new Error("Parakeet requires Apple Silicon (M-series) Mac");
        }
        // Check if uv is installed and find its location
        toast.message = "Checking uv installation...";
        const uvPath = await findUvBinary();
        if (!uvPath) {
            throw new Error("uv is required but not installed. Please install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh");
        }
        console.log(`Found uv at: ${uvPath}`);
        // Install parakeet-mlx via uv tool
        toast.message = "Installing parakeet-mlx...";
        await execAsync(`"${uvPath}" tool install parakeet-mlx -U`);
        // Verify installation
        toast.message = "Verifying installation...";
        const isInstalled = await (0, exports.isParakeetInstalled)();
        if (!isInstalled) {
            throw new Error("Installation verification failed");
        }
        toast.style = api_1.Toast.Style.Success;
        toast.message = "Parakeet installed successfully!";
        await showSystemNotification("Parakeet Ready", "Parakeet has been installed successfully. You can now use ultra-fast local transcription on Apple Silicon.");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await toast.hide();
    }
    catch (error) {
        console.error("Error installing Parakeet:", error);
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to install Parakeet";
        await showSystemNotification("Parakeet Installation Failed", error instanceof Error ? error.message : "Installation failed. Please check the logs.");
        throw error;
    }
}
/**
 * Install Whisper locally (existing implementation)
 */
async function installWhisper() {
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: "Installing Whisper",
        message: "Checking current installation...",
    });
    try {
        if (await (0, exports.isWhisperBinaryWorking)()) {
            toast.style = api_1.Toast.Style.Success;
            toast.message = "Whisper is already installed and working!";
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await toast.hide();
            return;
        }
        await ensureDirectories();
        const whisperBin = path_1.default.join(WHISPER_BIN_DIR, "whisper");
        const tempDir = path_1.default.join(WHISPER_DIR, "temp");
        const srcDir = WHISPER_SRC_DIR;
        if (fs_1.default.existsSync(whisperBin)) {
            fs_1.default.unlinkSync(whisperBin);
        }
        if (fs_1.default.existsSync(tempDir)) {
            fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        if (fs_1.default.existsSync(srcDir)) {
            fs_1.default.rmSync(srcDir, { recursive: true, force: true });
        }
        fs_1.default.mkdirSync(tempDir);
        toast.message = "Downloading source code...";
        console.log("Downloading source from:", WHISPER_SOURCE_URL);
        const archivePath = path_1.default.join(tempDir, "whisper.tar.gz");
        await execAsync(`curl -L "${WHISPER_SOURCE_URL}" -o "${archivePath}"`);
        toast.message = "Extracting source code...";
        await execAsync(`cd "${tempDir}" && tar xzf whisper.tar.gz`);
        const extractedDir = path_1.default.join(tempDir, "whisper.cpp-1.5.4");
        fs_1.default.renameSync(extractedDir, srcDir);
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        toast.message = "Compiling Whisper...";
        console.log("Compiling in directory:", srcDir);
        await execAsync(`cd "${srcDir}" && make clean && make`);
        fs_1.default.copyFileSync(path_1.default.join(srcDir, "main"), whisperBin);
        await execAsync(`chmod +x "${whisperBin}"`);
        console.log("Copied and made binary executable");
        process.env.LANG = "en_US.UTF-8";
        process.env.LC_ALL = "en_US.UTF-8";
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
            const { stdout: versionOut } = await execAsync(`"${whisperBin}" --version`);
            console.log("Whisper version output:", versionOut);
        }
        catch (error) {
            console.log("Version check failed, trying help...");
            const { stdout: helpOut } = await execAsync(`"${whisperBin}" --help`);
            console.log("Whisper help output:", helpOut);
        }
        const isWorking = await (0, exports.isWhisperBinaryWorking)();
        if (!isWorking) {
            throw new Error("Installation verification failed - binary not working properly");
        }
        toast.style = api_1.Toast.Style.Success;
        toast.message = "Whisper installed successfully!";
        await showSystemNotification("Offline Dictation Ready", "Whisper has been installed successfully. You can now use offline dictation with downloaded models.");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await toast.hide();
    }
    catch (error) {
        console.error("Error installing Whisper:", error);
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to install Whisper";
        await showSystemNotification("Whisper Installation Failed", "Installation failed. You can continue using online dictation. Try installing again later.");
        throw new Error(`Failed to install Whisper: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Download a specific Whisper model
 */
async function downloadWhisperModel(model) {
    if (!WHISPER_MODELS[model]) {
        throw new Error(`Invalid Whisper model: ${model}`);
    }
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: `Downloading ${model} Model`,
        message: "Preparing download...",
    });
    try {
        await ensureDirectories();
        const modelUrl = WHISPER_MODELS[model];
        const modelPath = path_1.default.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);
        toast.message = "Downloading model file...";
        await execAsync(`curl -L ${modelUrl} -o ${modelPath}`);
        toast.style = api_1.Toast.Style.Success;
        toast.message = "Model downloaded successfully!";
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await toast.hide();
    }
    catch (error) {
        console.error("Error downloading model:", error);
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to download model";
        throw new Error("Failed to download model");
    }
}
/**
 * Download a specific Parakeet model
 * Note: Parakeet automatically downloads models on first use, so this just ensures the model is ready
 */
async function downloadParakeetModel(modelId) {
    const model = PARAKEET_MODELS[modelId];
    if (!model) {
        throw new Error(`Invalid Parakeet model: ${modelId}`);
    }
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: `Preparing ${model.name}`,
        message: "Checking model availability...",
    });
    try {
        if (!isAppleSiliconCompatible()) {
            throw new Error("Parakeet models require Apple Silicon");
        }
        const isParakeetReady = await (0, exports.isParakeetInstalled)();
        if (!isParakeetReady) {
            throw new Error("Parakeet is not installed. Please install it first.");
        }
        toast.message = "Verifying model setup...";
        // Get uv path for running parakeet-mlx
        const uvPath = await findUvBinary();
        if (!uvPath) {
            throw new Error("uv is required to run Parakeet");
        }
        // Test Parakeet with a quick audio file to trigger model download if needed
        const tempDir = os_1.default.tmpdir();
        const testAudioPath = path_1.default.join(tempDir, `parakeet_test_${Date.now()}.wav`);
        try {
            // Create a very short test audio file (1 second of silence)
            await execAsync(`ffmpeg -y -f lavfi -i "anullsrc=duration=1:sample_rate=16000" -c:a pcm_s16le "${testAudioPath}"`);
            toast.message = "Testing model (this may download the model automatically)...";
            // Run Parakeet on the test file via uv with proper PATH - this will download the model if not already cached
            await execAsync(`export PATH="/opt/homebrew/bin:$PATH" && "${uvPath}" tool run --from parakeet-mlx parakeet-mlx --output-dir "${tempDir}" --output-format txt "${testAudioPath}"`, { shell: "/bin/zsh" });
            // Clean up test files
            try {
                fs_1.default.unlinkSync(testAudioPath);
                // Remove any generated transcript files
                const testBasename = path_1.default.basename(testAudioPath, ".wav");
                const transcriptPath = path_1.default.join(tempDir, `${testBasename}.txt`);
                if (fs_1.default.existsSync(transcriptPath)) {
                    fs_1.default.unlinkSync(transcriptPath);
                }
            }
            catch (cleanupError) {
                console.warn("Cleanup warning:", cleanupError);
            }
        }
        catch (testError) {
            // Clean up on error
            try {
                if (fs_1.default.existsSync(testAudioPath)) {
                    fs_1.default.unlinkSync(testAudioPath);
                }
            }
            catch (cleanupError) {
                console.warn("Cleanup error:", cleanupError);
            }
            throw new Error(`Model test failed: ${testError}`);
        }
        toast.style = api_1.Toast.Style.Success;
        toast.message = "Model is ready for use!";
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await toast.hide();
    }
    catch (error) {
        console.error("Error preparing Parakeet model:", error);
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to prepare model";
        throw error;
    }
}
/**
 * Clean up all local model installations
 */
async function cleanupLocalModels() {
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: "Cleaning Up Local Models",
        message: "Preparing cleanup...",
    });
    try {
        let totalSize = 0;
        // Clean up Whisper
        if (fs_1.default.existsSync(WHISPER_DIR)) {
            toast.message = "Removing Whisper files...";
            const getSizeRecursive = (dirPath) => {
                let size = 0;
                try {
                    const files = fs_1.default.readdirSync(dirPath);
                    for (const file of files) {
                        try {
                            const filePath = path_1.default.join(dirPath, file);
                            const stats = fs_1.default.statSync(filePath);
                            if (stats.isDirectory()) {
                                size += getSizeRecursive(filePath);
                            }
                            else {
                                size += stats.size;
                            }
                        }
                        catch (error) {
                            console.warn(`Skipping file ${file}:`, error);
                        }
                    }
                }
                catch (error) {
                    console.warn(`Skipping directory ${dirPath}:`, error);
                }
                return size;
            };
            try {
                totalSize += getSizeRecursive(WHISPER_DIR);
            }
            catch (error) {
                console.warn("Failed to calculate Whisper size:", error);
            }
            fs_1.default.rmSync(WHISPER_DIR, { recursive: true, force: true });
        }
        // Clean up Parakeet
        toast.message = "Removing Parakeet installation...";
        try {
            const uvPath = await findUvBinary();
            if (uvPath) {
                await execAsync(`"${uvPath}" tool uninstall parakeet-mlx`);
            }
        }
        catch (error) {
            console.warn("Parakeet was not installed via uv tool:", error);
        }
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
        const message = totalSize > 0 ? `Cleanup complete! Freed ${sizeInMB}MB of space` : "Cleanup complete!";
        toast.style = api_1.Toast.Style.Success;
        toast.message = message;
        await showSystemNotification("Local Models Cleanup Complete", totalSize > 0
            ? `Successfully removed local model files and freed ${sizeInMB}MB of space.`
            : "Successfully removed local model files.");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await toast.hide();
    }
    catch (error) {
        console.error("Error cleaning up local models:", error);
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to clean up local model files";
        throw new Error("Failed to clean up local model files");
    }
}
/**
 * Get all available local models
 */
async function getAvailableLocalModels() {
    console.log("=== getAvailableLocalModels: Starting ===");
    const models = [];
    // Whisper models (synchronous, fast)
    console.log("Processing Whisper models...");
    for (const [modelId] of Object.entries(WHISPER_MODELS)) {
        const isDownloaded = isWhisperModelDownloaded(modelId);
        console.log(`Whisper model ${modelId}: downloaded=${isDownloaded}`);
        models.push({
            id: `whisper-${modelId}`,
            name: `Whisper ${modelId.charAt(0).toUpperCase() + modelId.slice(1)}`,
            description: getWhisperModelDescription(modelId),
            engine: "whisper",
            isInstalled: isDownloaded,
            isCompatible: true,
        });
    }
    // Parakeet models (with timeout to prevent hanging)
    console.log("Processing Parakeet models...");
    for (const [modelId, model] of Object.entries(PARAKEET_MODELS)) {
        console.log(`Checking Parakeet model ${modelId}...`);
        let isInstalled = false;
        try {
            const checkStart = Date.now();
            // Add shorter timeout to prevent hanging
            isInstalled = await Promise.race([
                isParakeetModelDownloaded(modelId),
                new Promise((resolve) => setTimeout(() => {
                    console.log(`Parakeet model ${modelId} check timed out after 2s`);
                    resolve(false);
                }, 2000)),
            ]);
            console.log(`Parakeet model ${modelId} check completed in ${Date.now() - checkStart}ms: installed=${isInstalled}`);
        }
        catch (error) {
            console.warn(`Failed to check Parakeet model ${modelId}:`, error);
            isInstalled = false;
        }
        models.push({
            id: `parakeet-${modelId}`,
            name: model.name,
            description: model.description,
            engine: "parakeet",
            isInstalled,
            isCompatible: isAppleSiliconCompatible(),
            requirements: model.requirements,
        });
    }
    console.log(`=== getAvailableLocalModels: Completed with ${models.length} models ===`);
    return models;
}
function getWhisperModelDescription(model) {
    const descriptions = {
        tiny: "Fastest model, ~75MB. Good for quick transcriptions with decent accuracy.",
        base: "Balanced model, ~150MB. Good accuracy for most use cases.",
        small: "More accurate model, ~500MB. Better for complex audio.",
        medium: "Most accurate model, ~1.5GB. Best quality but slower.",
    };
    return descriptions[model] || "Whisper model";
}
// Audio format optimization: Since we control the recording format with sox,
// we record directly in the correct format (16kHz mono 16-bit PCM) and eliminate
// all conversion logic. This removes the need for ffmpeg analysis and conditional conversion.
/**
 * Transcribe audio using Parakeet
 */
async function transcribeWithParakeet(audioPath, modelId, language) {
    console.log("Starting Parakeet transcription:", { audioPath, modelId, language });
    const model = PARAKEET_MODELS[modelId];
    if (!model) {
        throw new Error(`Invalid Parakeet model: ${modelId}`);
    }
    if (!isAppleSiliconCompatible()) {
        throw new Error("Parakeet requires Apple Silicon");
    }
    // Check language compatibility
    if (language && language !== "auto" && model.languages && !model.languages.includes(language)) {
        console.warn(`Parakeet model ${modelId} does not support language ${language}. Supported languages: ${model.languages.join(", ")}`);
        throw new Error(`Parakeet model ${model.name} only supports: ${model.languages.join(", ")}. For other languages, please use Whisper or OpenAI models.`);
    }
    const isParakeetReady = await (0, exports.isParakeetInstalled)();
    if (!isParakeetReady) {
        throw new Error("Parakeet is not installed");
    }
    try {
        // Get uv path for running parakeet-mlx
        const uvPath = await findUvBinary();
        if (!uvPath) {
            throw new Error("uv is required to run Parakeet");
        }
        // Audio is already in correct format from sox recording
        const wavPath = audioPath;
        // Use uv tool run to execute Parakeet CLI with proper PATH and output directory
        console.log(`Using uv at: ${uvPath}`);
        const outputDir = os_1.default.tmpdir(); // Use temp directory for output files
        const parakeetCommand = `export PATH="/opt/homebrew/bin:$PATH" && "${uvPath}" tool run --from parakeet-mlx parakeet-mlx --output-dir "${outputDir}" --output-format txt "${wavPath}"`;
        console.log("Executing Parakeet command:", parakeetCommand);
        const { stdout, stderr } = await execAsync(parakeetCommand, { shell: "/bin/zsh" });
        if (stderr) {
            console.warn("Parakeet stderr output:", stderr);
        }
        console.log("Parakeet stdout length:", stdout.length);
        console.log("Parakeet stdout preview:", stdout.substring(0, 200));
        // Read the generated text file
        const audioBasename = path_1.default.basename(wavPath, ".wav");
        const outputFile = path_1.default.join(outputDir, `${audioBasename}.txt`);
        let text = "";
        try {
            if (fs_1.default.existsSync(outputFile)) {
                text = fs_1.default.readFileSync(outputFile, "utf8").trim();
                console.log("Read transcription from file:", outputFile);
                console.log("Transcription text length:", text.length);
                // Clean up the output file
                fs_1.default.unlinkSync(outputFile);
            }
            else {
                console.warn("Output file not found:", outputFile);
                // Fallback to stdout if file not found
                text = stdout.trim();
            }
        }
        catch (error) {
            console.warn("Error reading output file:", error);
            // Fallback to stdout
            text = stdout.trim();
        }
        // No cleanup needed since we use the original file directly
        if (!text) {
            throw new Error("Parakeet produced empty output");
        }
        return text;
    }
    catch (error) {
        console.error("Error executing Parakeet:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to execute Parakeet: ${error.message}`);
        }
        throw error;
    }
}
/**
 * Transcribe audio using Whisper (existing implementation)
 */
async function transcribeWithWhisper(audioPath, model, language) {
    console.log("Starting local Whisper transcription:", { audioPath, model, language });
    const whisperInstalled = await isWhisperInstalled();
    if (!whisperInstalled) {
        throw new Error("Whisper is not installed");
    }
    if (!isWhisperModelDownloaded(model)) {
        throw new Error(`Model ${model} is not downloaded`);
    }
    const modelPath = path_1.default.join(WHISPER_MODELS_DIR, `ggml-${model}.bin`);
    const whisperPath = path_1.default.join(WHISPER_BIN_DIR, "whisper");
    console.log("Using Whisper configuration:", {
        modelPath,
        whisperPath,
        exists: {
            model: fs_1.default.existsSync(modelPath),
            binary: fs_1.default.existsSync(whisperPath),
            audio: fs_1.default.existsSync(audioPath),
        },
    });
    // Verify audio file format
    try {
        const { stdout: ffprobeOut } = await execAsync(`"${FFPROBE_PATH}" -i "${audioPath}" 2>&1`);
        console.log("Audio file info:", ffprobeOut);
    }
    catch (error) {
        console.warn("Could not get audio file info:", error);
    }
    try {
        // Audio is already in correct format from sox recording
        const wavPath = audioPath;
        // Build Whisper command with all necessary options
        const languageParam = language && language !== "auto" ? ` -l ${language}` : "";
        const translateParam = !language || language === "auto" ? " --language auto" : "";
        const command = `${whisperPath} -m ${modelPath} -f "${wavPath}" -osrt -nt${languageParam}${translateParam}`;
        console.log("Executing Whisper command:", command);
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            console.warn("Whisper stderr output:", stderr);
        }
        console.log("Whisper stdout length:", stdout.length);
        console.log("Whisper stdout preview:", stdout.substring(0, 200));
        // No cleanup needed since we use the original file directly
        const text = stdout.trim();
        if (!text) {
            throw new Error("Whisper produced empty output");
        }
        return text;
    }
    catch (error) {
        console.error("Error executing Whisper:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to execute Whisper: ${error.message}`);
        }
        throw error;
    }
}
/**
 * Unified transcription function
 */
async function transcribeAudio(audioPath, engine, modelId, language) {
    if (engine === "whisper") {
        return await transcribeWithWhisper(audioPath, modelId, language);
    }
    else if (engine === "parakeet") {
        return await transcribeWithParakeet(audioPath, modelId, language);
    }
    else {
        throw new Error(`Unsupported engine: ${engine}`);
    }
}
/**
 * Check if local transcription is available for a specific engine and model
 */
async function isLocalTranscriptionAvailable(engine, modelId) {
    if (engine === "whisper") {
        return isWhisperInstalled() && isWhisperModelDownloaded(modelId);
    }
    else if (engine === "parakeet") {
        return (await (0, exports.isParakeetInstalled)()) && (await isParakeetModelDownloaded(modelId));
    }
    return false;
}
// Legacy exports for backward compatibility
exports.downloadModel = downloadWhisperModel;
exports.cleanupWhisper = cleanupLocalModels;
const legacyIsModelDownloaded = (model) => isWhisperModelDownloaded(model);
exports.legacyIsModelDownloaded = legacyIsModelDownloaded;
const getDownloadedModels = () => {
    if (!fs_1.default.existsSync(WHISPER_MODELS_DIR)) {
        return [];
    }
    return fs_1.default
        .readdirSync(WHISPER_MODELS_DIR)
        .filter((file) => file.startsWith("ggml-") && file.endsWith(".bin"))
        .map((file) => file.replace("ggml-", "").replace(".bin", ""));
};
exports.getDownloadedModels = getDownloadedModels;
const getAvailableModels = () => Object.keys(WHISPER_MODELS);
exports.getAvailableModels = getAvailableModels;
