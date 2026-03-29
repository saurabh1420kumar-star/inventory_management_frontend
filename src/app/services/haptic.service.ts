import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Centralized haptic feedback service for native mobile platforms.
 * All methods are no-ops on web/browser — safe to call anywhere.
 */
@Injectable({ providedIn: 'root' })
export class HapticService {

  private get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // ── Impact Feedback ───────────────────────────────────────

  /** Light tap — tab switches, toggles, expand/collapse, menu taps */
  light() {
    if (this.isNative) Haptics.impact({ style: ImpactStyle.Light });
  }

  /** Medium tap — button presses, add to cart, open modal, selections */
  medium() {
    if (this.isNative) Haptics.impact({ style: ImpactStyle.Medium });
  }

  /** Heavy tap — place order, approve/reject, confirm delete, critical actions */
  heavy() {
    if (this.isNative) Haptics.impact({ style: ImpactStyle.Heavy });
  }

  // ── Notification Feedback ─────────────────────────────────

  /** Success — form submitted, payment approved, order placed */
  success() {
    if (this.isNative) Haptics.notification({ type: NotificationType.Success });
  }

  /** Warning — validation error, form invalid, restricted action */
  warning() {
    if (this.isNative) Haptics.notification({ type: NotificationType.Warning });
  }

  /** Error — API failure, login failed, critical error */
  error() {
    if (this.isNative) Haptics.notification({ type: NotificationType.Error });
  }

  // ── Selection Feedback ────────────────────────────────────

  /** Selection changed — segment switch, filter change, picker scroll */
  selectionChanged() {
    if (this.isNative) Haptics.selectionChanged();
  }

  /** Start selection — begin drag/swipe/long-press */
  selectionStart() {
    if (this.isNative) Haptics.selectionStart();
  }

  /** End selection — finish drag/swipe/long-press */
  selectionEnd() {
    if (this.isNative) Haptics.selectionEnd();
  }

  // ── Custom Vibration ──────────────────────────────────────

  /** Custom vibration for alerts (300ms default) */
  vibrate(duration = 300) {
    if (this.isNative) Haptics.vibrate({ duration });
  }
}
