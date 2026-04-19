const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks — Metro needs explicit opt-in to follow them
config.resolver.unstable_enableSymlinks = true;

// Resolve @forge packages from workspace + pnpm-symlinked native modules
// that Metro can't follow through the .pnpm store
config.resolver.extraNodeModules = {
  '@forge/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
  'expo-apple-authentication': path.resolve(projectRoot, 'node_modules', 'expo-apple-authentication'),
};

module.exports = withNativeWind(config, { input: './src/global.css' });
