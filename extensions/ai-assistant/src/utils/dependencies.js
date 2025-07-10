"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDependencies = checkDependencies;
exports.installDependency = installDependency;
exports.installAllMissingDependencies = installAllMissingDependencies;
exports.showDependencyNotification = showDependencyNotification;
const child_process_1 = require("child_process");
const util_1 = require("util");
const api_1 = require("@raycast/api");
const os_1 = __importDefault(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Check if Homebrew is installed
 */
async function isHomebrewInstalled() {
    try {
        await execAsync("which brew");
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Install Homebrew if not present
 */
async function installHomebrew() {
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: "Installing Homebrew",
        message: "This is required for dependency management...",
    });
    try {
        const installCommand = `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`;
        await execAsync(installCommand);
        // Add Homebrew to PATH
        const homebrewPath = "/opt/homebrew/bin";
        process.env.PATH = `${homebrewPath}:${process.env.PATH}`;
        toast.style = api_1.Toast.Style.Success;
        toast.message = "Homebrew installed successfully!";
        setTimeout(() => toast.hide(), 2000);
    }
    catch (error) {
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to install Homebrew";
        throw error;
    }
}
/**
 * Check if a command is available in the system
 */
async function checkCommand(command, paths) {
    const searchPaths = paths || ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
    // First try with 'which' command
    try {
        const { stdout } = await execAsync(`which ${command}`);
        if (stdout.trim()) {
            try {
                const { stdout: versionOutput } = await execAsync(`${command} --version 2>/dev/null || ${command} -version 2>/dev/null || echo "unknown"`);
                return { installed: true, version: versionOutput.trim().split("\n")[0] };
            }
            catch {
                return { installed: true, version: "unknown" };
            }
        }
    }
    catch {
        // Continue to path-based search
    }
    // Then try common paths
    for (const path of searchPaths) {
        try {
            const fullPath = `${path}/${command}`;
            await execAsync(`test -f "${fullPath}" && test -x "${fullPath}"`);
            try {
                const { stdout } = await execAsync(`${fullPath} --version 2>/dev/null || ${fullPath} -version 2>/dev/null || echo "unknown"`);
                return { installed: true, version: stdout.trim().split("\n")[0] };
            }
            catch {
                return { installed: true, version: "unknown" };
            }
        }
        catch {
            continue;
        }
    }
    return { installed: false };
}
/**
 * Install a package using Homebrew
 */
async function installWithHomebrew(packageName, description) {
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: `Installing ${description}`,
        message: "Please wait...",
    });
    try {
        // Ensure Homebrew is installed
        if (!(await isHomebrewInstalled())) {
            toast.message = "Installing Homebrew first...";
            await installHomebrew();
        }
        // Update Homebrew
        toast.message = "Updating Homebrew...";
        await execAsync("brew update");
        // Install the package
        toast.message = `Installing ${packageName}...`;
        await execAsync(`brew install ${packageName}`);
        toast.style = api_1.Toast.Style.Success;
        toast.message = `${description} installed successfully!`;
        setTimeout(() => toast.hide(), 2000);
    }
    catch (error) {
        toast.style = api_1.Toast.Style.Failure;
        toast.message = `Failed to install ${description}`;
        throw error;
    }
}
/**
 * Install uv (Python package manager)
 */
async function installUv() {
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: "Installing uv",
        message: "Installing Python package manager...",
    });
    try {
        // Install uv using the official installer
        await execAsync(`curl -LsSf https://astral.sh/uv/install.sh | sh`);
        // Add uv to PATH
        const uvPath = `${os_1.default.homedir()}/.local/bin`;
        process.env.PATH = `${uvPath}:${process.env.PATH}`;
        toast.style = api_1.Toast.Style.Success;
        toast.message = "uv installed successfully!";
        setTimeout(() => toast.hide(), 2000);
    }
    catch (error) {
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to install uv";
        throw error;
    }
}
/**
 * Check all required dependencies
 */
async function checkDependencies() {
    const dependencies = [];
    // Check Sox (required for audio recording)
    const soxCheck = await checkCommand("sox");
    dependencies.push({
        name: "sox",
        isInstalled: soxCheck.installed,
        version: soxCheck.version,
        installCommand: "brew install sox",
        description: "Audio recording and processing",
        required: true,
    });
    // Check FFmpeg (required for audio processing)
    const ffmpegCheck = await checkCommand("ffmpeg");
    dependencies.push({
        name: "ffmpeg",
        isInstalled: ffmpegCheck.installed,
        version: ffmpegCheck.version,
        installCommand: "brew install ffmpeg",
        description: "Video and audio processing",
        required: true,
    });
    // Check FFprobe (required for audio analysis)
    const ffprobeCheck = await checkCommand("ffprobe");
    dependencies.push({
        name: "ffprobe",
        isInstalled: ffprobeCheck.installed,
        version: ffprobeCheck.version,
        installCommand: "brew install ffmpeg", // ffprobe comes with ffmpeg
        description: "Audio and video analysis",
        required: true,
    });
    // Check uv (required for Parakeet models on Apple Silicon)
    const uvCheck = await checkCommand("uv", [`${os_1.default.homedir()}/.local/bin`]);
    dependencies.push({
        name: "uv",
        isInstalled: uvCheck.installed,
        version: uvCheck.version,
        installCommand: "curl -LsSf https://astral.sh/uv/install.sh | sh",
        description: "Python package manager (for Parakeet models)",
        required: false, // Optional for Apple Silicon users
    });
    const allInstalled = dependencies.filter((d) => d.required).every((d) => d.isInstalled);
    const missingRequired = dependencies.filter((d) => d.required && !d.isInstalled).map((d) => d.name);
    return {
        allInstalled,
        dependencies,
        missingRequired,
    };
}
/**
 * Install a specific dependency
 */
async function installDependency(dependencyName) {
    switch (dependencyName) {
        case "sox":
            await installWithHomebrew("sox", "Sox");
            break;
        case "ffmpeg":
            await installWithHomebrew("ffmpeg", "FFmpeg");
            break;
        case "ffprobe":
            await installWithHomebrew("ffmpeg", "FFmpeg (includes ffprobe)");
            break;
        case "uv":
            await installUv();
            break;
        default:
            throw new Error(`Unknown dependency: ${dependencyName}`);
    }
}
/**
 * Install all missing required dependencies
 */
async function installAllMissingDependencies() {
    const toast = await (0, api_1.showToast)({
        style: api_1.Toast.Style.Animated,
        title: "Installing Dependencies",
        message: "Checking what needs to be installed...",
    });
    try {
        const status = await checkDependencies();
        if (status.allInstalled) {
            toast.style = api_1.Toast.Style.Success;
            toast.message = "All dependencies are already installed!";
            setTimeout(() => toast.hide(), 2000);
            return;
        }
        // Install missing dependencies
        const uniqueDependencies = [...new Set(status.missingRequired)];
        for (const dep of uniqueDependencies) {
            toast.message = `Installing ${dep}...`;
            await installDependency(dep);
        }
        // Verify installation
        toast.message = "Verifying installation...";
        const finalStatus = await checkDependencies();
        if (finalStatus.allInstalled) {
            toast.style = api_1.Toast.Style.Success;
            toast.message = "All dependencies installed successfully!";
        }
        else {
            toast.style = api_1.Toast.Style.Failure;
            toast.message = "Some dependencies failed to install";
        }
        setTimeout(() => toast.hide(), 2000);
    }
    catch (error) {
        toast.style = api_1.Toast.Style.Failure;
        toast.message = "Failed to install dependencies";
        throw error;
    }
}
/**
 * Show system notification for dependency status
 */
async function showDependencyNotification(status) {
    if (status.allInstalled) {
        await execAsync(`osascript -e 'display notification "All required dependencies are installed and ready!" with title "AI Assistant Dependencies"'`);
    }
    else {
        const missing = status.missingRequired.join(", ");
        await execAsync(`osascript -e 'display notification "Missing dependencies: ${missing}. Click to install automatically." with title "AI Assistant Dependencies"'`);
    }
}
