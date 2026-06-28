import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.nectar.inventory',
  appName: 'NAYLA Inventory tool',
  webDir: 'www',
  plugins: {
    Keyboard: {
      // Resize the app body so inputs are not hidden behind the keyboard on forms.
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
