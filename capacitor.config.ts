import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xxtstar.app',
  appName: 'xxt Star',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: 'http://localhost:3000',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

// Development mode: use local server
if (process.env.NODE_ENV === 'development') {
  config.server = {
    url: 'http://localhost:3000',
    cleartext: true,
  };
}

export default config;
