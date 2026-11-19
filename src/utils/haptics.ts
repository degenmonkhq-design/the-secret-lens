/**
 * Gentle mobile haptic feedback utility.
 * Silent on audio (zero beeps or click tones) — uses only a crisp 10ms tactile pulse.
 */
export function triggerGentleHaptic(durationMs = 10): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(durationMs);
    }
  } catch {
    // Ignore on unsupported devices or restricted iframes
  }
}
