import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.financeiro.casal',
  appName: 'finance+',
  webDir: 'dist',
  // The web bundle is served from the app itself; the API is reached over the
  // network at the URL baked in at build time via VITE_BACKEND_URL.
  android: {
    // Allow plain http:// for local-network testing (a LAN backend). HTTPS is
    // unaffected; for a real deploy point VITE_BACKEND_URL at an https:// URL.
    allowMixedContent: true,
  },
};

export default config;
