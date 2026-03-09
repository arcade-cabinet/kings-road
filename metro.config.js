// Learn more https://docs.expo.io/guides/customizing-metro
import { getDefaultConfig } from 'expo/metro-config';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(import.meta.dirname);

// Add 3D asset extensions for R3F model/texture loading
config.resolver.assetExts.push('glb', 'gltf', 'bin');

export default config;
