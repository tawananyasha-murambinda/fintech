import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fintrack.app",
  appName: "FinTrack",
  webDir: "public",
  server: {
    url: "https://fintrack-pearl-eight.vercel.app",
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: "APK",
    },
  },
  ios: {
    scheme: "App",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0d0d1a",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
