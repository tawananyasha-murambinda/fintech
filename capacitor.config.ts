import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fintrack.app',
  appName: 'FinTrack',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'localhost',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
  },
  ios: {
    scheme: 'App',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f0fdf9',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
