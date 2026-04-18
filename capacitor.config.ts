import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcadecabinet.kingsroad',
  appName: "King's Road",
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [],
  },
};

export default config;
