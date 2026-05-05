const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = Array.from(new Set([
  ...config.resolver.assetExts,
  "pte",
  "gemmajson",
]));

// ── Web-compat resolver ───────────────────────────────────────────────────────
// react-native 0.79 added internal modules (BaseViewConfig, PlatformBaseViewConfig,
// etc.) that react-native-web 0.20 doesn't yet provide stubs for.
// When a web-platform build encounters an unresolvable import that originates
// INSIDE the react-native package itself, redirect it to an empty stub rather
// than crashing the entire bundle.
const RN_WEB_STUB = path.resolve(__dirname, "shims/RNWebStub.js");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    // On web, completely stub out react-native-maps (native-only package)
    if (platform === "web" && (
      moduleName === "react-native-maps" ||
      moduleName.startsWith("react-native-maps/") ||
      context.originModulePath?.includes("/node_modules/react-native-maps/")
    )) {
      return { filePath: RN_WEB_STUB, type: "sourceFile" };
    }
    return context.resolveRequest(context, moduleName, platform);
  } catch (err) {
    const isWebBuild = platform === "web";
    const fromRNInternal = context.originModulePath?.includes("/node_modules/react-native/");
    const fromNativePkg = context.originModulePath?.includes("/node_modules/react-native-maps/");
    if (isWebBuild && (fromRNInternal || fromNativePkg)) {
      // Silently stub — these modules are native-renderer internals that are
      // never called at runtime in a web/WKWebView context.
      return { filePath: RN_WEB_STUB, type: "sourceFile" };
    }
    throw err;
  }
};

module.exports = withNativeWind(config, { input: "./src/styles/global.css" });
