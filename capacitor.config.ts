import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jmeb.mantenimientoapp',
  appName: 'MantPro',
  webDir: 'build',
  server: {
    androidScheme: "https"
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#030712",
      showSpinner: false
    }
  }
};

export default config;
