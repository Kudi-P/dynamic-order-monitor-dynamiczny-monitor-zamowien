// Safely resolve applet config without failing Vite compilation if deleted
const appletConfigs = import.meta.glob<{ default: Record<string, string> }>('/firebase-applet-config.json', {
  eager: true,
});

const appletConfig: Record<string, string> =
  appletConfigs['/firebase-applet-config.json']?.default || {};

// Merges configuration from environment variables (Vite / Vercel), local applet config, or fallback
export const firebaseConfig = {
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || appletConfig.projectId || 'gen-lang-client-0931794100',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || appletConfig.appId || '1:915245334257:web:77fc466a6a8306cb20f350',
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || appletConfig.apiKey || 'AIzaSyCkEvVWBZoPWQVveXHuljTeI3Lt3T7wavs',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || appletConfig.authDomain || 'gen-lang-client-0931794100.firebaseapp.com',
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || appletConfig.firestoreDatabaseId || 'ai-studio-dynamicordertrac-2993c604-91ff-4317-a0dc-143bb0a224de',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || appletConfig.storageBucket || 'gen-lang-client-0931794100.firebasestorage.app',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || appletConfig.messagingSenderId || '915245334257',
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || appletConfig.measurementId || '',
  oAuthClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || appletConfig.oAuthClientId || '915245334257-e30a5625equdpi31tgc7afr3hv4pfc89.apps.googleusercontent.com',
  recaptchaSiteKey: appletConfig.recaptchaSiteKey || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== '' &&
  firebaseConfig.projectId !== ''
);

export default firebaseConfig;
