/**
 * Utility functions for dynamic color handling
 */

// Color name to hex mapping
const COLOR_MAP: Record<string, string> = {
  violet: '#8b5cf6',
  sky: '#38bdf8',
  teal: '#14b8a6',
  rose: '#f43f5e',
  amber: '#f59e0b',
  emerald: '#10b981',
  pink: '#ec4899',
  indigo: '#6366f1',
};

/**
 * Convert color name to hex
 */
export function colorNameToHex(colorName: string): string {
  return COLOR_MAP[colorName.toLowerCase()] || COLOR_MAP.violet;
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Lighten a hex color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * (percent / 100)));
  const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * (percent / 100)));
  const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * (percent / 100)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a hex color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.max(0, Math.floor(rgb.r * (1 - percent / 100)));
  const g = Math.max(0, Math.floor(rgb.g * (1 - percent / 100)));
  const b = Math.max(0, Math.floor(rgb.b * (1 - percent / 100)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get dynamic color styles for a deck based on color name or hex
 */
export function getDeckColorStyles(color: string) {
  // Convert color name to hex if needed
  const hexColor = color.startsWith('#') ? color : colorNameToHex(color);
  
  const lightColor = lightenColor(hexColor, 40);
  const darkColor = darkenColor(hexColor, 15);
  const rgb = hexToRgb(hexColor);
  
  return {
    // For inline styles
    gradient: `linear-gradient(to bottom right, ${hexColor}, ${darkColor})`,
    solidBg: hexColor,
    lightBg: lightColor,
    shadow: rgb ? `0 10px 25px -5px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : undefined,
    
    // For text/borders
    textColor: hexColor,
    borderColor: lightColor,
  };
}

/**
 * Check if a color is light or dark (for text contrast)
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  
  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}
