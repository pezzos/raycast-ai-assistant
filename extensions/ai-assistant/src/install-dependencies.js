"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const dependencies_1 = require("./utils/dependencies");
function Command() {
    const [dependencies, setDependencies] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isInstalling, setIsInstalling] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        checkDependenciesStatus();
    }, []);
    const checkDependenciesStatus = async () => {
        setIsLoading(true);
        try {
            const status = await (0, dependencies_1.checkDependencies)();
            setDependencies(status.dependencies);
        }
        catch (error) {
            console.error("Error checking dependencies:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Error",
                message: "Failed to check dependencies status",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleInstallDependency = async (dependencyName) => {
        setIsInstalling(dependencyName);
        try {
            await (0, dependencies_1.installDependency)(dependencyName);
            await checkDependenciesStatus(); // Refresh status after installation
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Success",
                message: `${dependencyName} installed successfully!`,
            });
        }
        catch (error) {
            console.error(`Error installing ${dependencyName}:`, error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Installation Failed",
                message: `Failed to install ${dependencyName}. Please check the logs.`,
            });
        }
        finally {
            setIsInstalling(null);
        }
    };
    const getStatusIcon = (isInstalled) => {
        return isInstalled
            ? { icon: api_1.Icon.CheckCircle, tintColor: api_1.Color.Green }
            : { icon: api_1.Icon.XMarkCircle, tintColor: api_1.Color.Red };
    };
    const getStatusText = (isInstalled) => {
        return isInstalled ? "Installed" : "Not Installed";
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { isLoading: isLoading, searchBarPlaceholder: "Search dependencies...", children: [(0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "System Dependencies", children: dependencies.map((dep) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: dep.name, subtitle: dep.description, accessories: [
                        {
                            text: dep.version || getStatusText(dep.isInstalled),
                            ...getStatusIcon(dep.isInstalled),
                        },
                    ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh Status", icon: api_1.Icon.ArrowClockwise, onAction: checkDependenciesStatus, shortcut: { modifiers: ["cmd"], key: "r" } }), !dep.isInstalled && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: isInstalling === dep.name ? "Installing…" : `Install ${dep.name}`, icon: api_1.Icon.Download, onAction: () => handleInstallDependency(dep.name), shortcut: { modifiers: ["cmd"], key: "i" } })), dep.installCommand && ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Install Command", content: dep.installCommand, shortcut: { modifiers: ["cmd"], key: "c" } }))] }) }, dep.name))) }), (0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Installation Info", children: (0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "About Dependencies", subtitle: "Required system dependencies for AI Assistant", accessories: [{ text: "ℹ️" }], actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { title: "View Documentation", url: "https://github.com/pezzos/raycast-ai-assistant#prerequisites" }) }) }) })] }));
}
