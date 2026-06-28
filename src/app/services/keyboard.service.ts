import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Thin wrapper around the native soft keyboard.
 * All methods are no-ops on web/browser — safe to call anywhere.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardService {

  /**
   * Dismiss the soft keyboard — call after a successful form submit so the
   * keyboard does not linger over the result (especially for inline forms
   * whose feedback overlay does not blur the focused input).
   */
  dismiss(): void {
    if (Capacitor.isNativePlatform()) {
      // May reject if the keyboard is already hidden — ignore.
      Keyboard.hide().catch(() => { /* no-op */ });
    }
  }
}
