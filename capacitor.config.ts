import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ID único de la app Android (debe coincidir con el package en AndroidManifest.xml)
  appId: 'co.cocinasintegralespereira.app',
  appName: 'Innovar Cocinas',
  // Directorio donde Vite genera el build del frontend
  webDir: 'dist/public',
  // En modo "live reload" apunta al servidor de producción
  // Quita esta sección para generar APK offline (assets empaquetados)
  // server: {
  //   url: 'https://app.cocinasintegralespereira.co',
  //   cleartext: false,
  // },
  android: {
    // Mínimo Android 6.0 (API 23) — cubre >98 % de dispositivos actuales
    minWebViewVersion: 60,
    // Permite capturar fotos con la cámara nativa
    // (requiere permisos en AndroidManifest.xml — ya se manejan por Capacitor)
    buildOptions: {
      keystorePath: undefined,    // ruta al .keystore cuando vayas a firmar para distribución
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',         // genera APK, no AAB (Play Store no es el destino)
    },
  },
  plugins: {
    // Push notifications — usamos la implementación web (web-push) en lugar de FCM
    // para no requerir Google Play Services en dispositivos sin él
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Si en el futuro quieres acceso a la cámara nativa desde la app:
    // Camera: {
    //   saveToGallery: false,
    // },
  },
};

export default config;
