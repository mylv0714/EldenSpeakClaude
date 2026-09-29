import type { CapacitorConfig } from '@capacitor/cli';

// Android build: `npm run android:add` once, then `npm run android:sync` after each web build.
// See docs/ANDROID.md for the full release checklist.
const config: CapacitorConfig = {
  appId: 'com.eldenspeak.app',
  appName: 'EldenSpeak',
  webDir: 'dist/client',
  android: {
    // The API must be served over HTTPS in production builds.
    allowMixedContent: false,
  },
};

export default config;
