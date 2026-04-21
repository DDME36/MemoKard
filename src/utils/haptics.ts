/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for better UX on mobile devices
 */

export const haptics = {
  /**
   * Light tap - for general interactions
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium tap - for button presses
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  /**
   * Heavy tap - for important actions or errors
   */
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  /**
   * Success pattern - for positive feedback
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  /**
   * Error pattern - for negative feedback
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  /**
   * Review quality feedback - different patterns for different quality levels
   */
  reviewQuality: (quality: number) => {
    if ('vibrate' in navigator) {
      if (quality <= 1) {
        // Again/Hard - longer vibration
        navigator.vibrate(80);
      } else if (quality === 2) {
        // Good - medium vibration
        navigator.vibrate(40);
      } else {
        // Easy - short vibration
        navigator.vibrate(20);
      }
    }
  },

  /**
   * Card flip - subtle feedback
   */
  cardFlip: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  },

  /**
   * Celebration - for completing reviews
   */
  celebration: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50, 100, 50]);
    }
  }
};

/**
 * Sound Effects Utilities
 * Provides audio feedback for better UX
 */
export const sounds = {
  /**
   * Play a sound effect
   */
  play: (type: 'flip' | 'success' | 'tap' | 'celebration') => {
    // Create audio context if not exists
    if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
      return;
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure sound based on type
      switch (type) {
        case 'flip':
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          break;

        case 'tap':
          oscillator.frequency.value = 600;
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.05);
          break;

        case 'success':
          // Play ascending notes
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;

        case 'celebration':
          // Play a cheerful melody
          const notes = [523, 659, 784, 1047]; // C, E, G, C (octave higher)
          notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.15);
            osc.start(audioContext.currentTime + i * 0.1);
            osc.stop(audioContext.currentTime + i * 0.1 + 0.15);
          });
          break;
      }
    } catch (error) {
      // Silently fail if audio context is not supported
      console.debug('Audio feedback not available:', error);
    }
  }
};
