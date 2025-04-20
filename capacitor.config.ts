import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dining.station',
  appName: 'Dining Station',
  webDir: 'build', 
  server: {
    url: 'https://dinging-station.web.app',
    cleartext: true
  }
};

export default config;
