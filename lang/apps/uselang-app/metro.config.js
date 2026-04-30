const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = Array.from(new Set([
  ...config.resolver.assetExts,
  "pte",
  "gemmajson",
]));

module.exports = withNativeWind(config, { input: "./src/styles/global.css" });
