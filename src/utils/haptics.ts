/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for better UX on mobile devices
 */

export const haptics = {
  /** Light tap - for general interactions */
  light: () => { if ('vibrate' in navigator) navigator.vibrate(10); },

  /** Medium tap - for button presses */
  medium: () => { if ('vibrate' in navigator) navigator.vibrate(30); },

  /** Heavy tap - for important actions or errors */
  heavy: () => { if ('vibrate' in navigator) navigator.vibrate(50); },

  /** Success pattern - for positive feedback */
  success: () => { if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]); },

  /** Error pattern - for negative feedback */
  error: () => { if ('vibrate' in navigator) navigator.vibrate([50, 100, 50]); },

  /** Review quality feedback - different patterns for different quality levels */
  reviewQuality: (quality: number) => {
    if (!('vibrate' in navigator)) return;
    if (quality <= 1) navigator.vibrate(80);
    else if (quality === 2) navigator.vibrate(40);
    else navigator.vibrate(20);
  },

  /** Card flip - subtle feedback */
  cardFlip: () => { if ('vibrate' in navigator) navigator.vibrate(15); },

  /** Celebration - for completing reviews */
  celebration: () => { if ('vibrate' in navigator) navigator.vibrate([50, 100, 50, 100, 50]); },
};

/**
 * Sound Effects Utilities
 * Uses a SHARED singleton AudioContext to avoid hitting the browser 6-context limit.
 * Always calls resume() before playing to handle autoplay policy on mobile.
 */

// ✅ Singleton — one context for the entire app lifetime
let _sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const ACtx = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!ACtx) return null;
  if (!_sharedCtx || _sharedCtx.state === 'closed') {
    _sharedCtx = new ACtx();
  }
  return _sharedCtx;
}

/** Resume the AudioContext if it is suspended (autoplay policy). */
async function ensureRunning(ctx: AudioContext) {
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

export const sounds = {
  /**
   * Play a sound effect.
   * Safe to call multiple times rapidly — reuses the same AudioContext.
   */
  play: async (type: 'flip' | 'success' | 'tap' | 'celebration') => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      await ensureRunning(ctx);

      const now = ctx.currentTime;

      const makeOsc = (freq: number, startOffset: number, duration: number, gain: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.frequency.value = freq;
        gainNode.gain.setValueAtTime(gain, now + startOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      switch (type) {
        case 'flip':
          makeOsc(800, 0, 0.08, 0.08);
          break;

        case 'tap':
          makeOsc(600, 0, 0.05, 0.05);
          break;

        case 'success': {
          // Ascending C–E–G
          const chord = [523, 659, 784];
          chord.forEach((freq, i) => makeOsc(freq, i * 0.08, 0.12, 0.08));
          break;
        }

        case 'celebration': {
          // Cheerful C–E–G–C arpeggio
          const notes = [523, 659, 784, 1047];
          notes.forEach((freq, i) => makeOsc(freq, i * 0.1, 0.15, 0.08));
          break;
        }
      }
    } catch (err) {
      // Silently fail — audio is non-critical
      console.debug('[sounds] Audio feedback unavailable:', err);
    }
  },
};
