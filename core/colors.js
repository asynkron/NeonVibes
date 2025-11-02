/**
 * Gravibe Color Helper
 * Generates neon colors based on string hashing for consistent color assignment.
 */

/**
 * Simple hash function to convert a string to a number
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
  let hash = 0;
  if (!str || str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a neon color from a service name.
 * Uses HSL color space with high saturation and brightness for neon effect.
 * @param {string} serviceName
 * @returns {string} HSL color string, e.g., "hsl(180, 85%, 65%)"
 */
export function generateServiceColor(serviceName) {
  if (!serviceName || typeof serviceName !== "string") {
    serviceName = "unknown-service";
  }

  const hash = hashString(serviceName);
  // Use modulo 360 to get hue (0-359 degrees on color wheel)
  const hue = hash % 360;

  // Neon colors need high saturation and medium-high lightness
  // Saturation: 75-95% for vibrant colors
  // Lightness: 55-70% for neon glow effect
  const saturation = 75 + (hash % 20); // 75-95%
  const lightness = 55 + (hash % 15);  // 55-70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Converts HSL color to RGB string for use in CSS rgb() or rgba()
 * @param {string} hslColor - HSL color string, e.g., "hsl(180, 85%, 65%)"
 * @returns {string} RGB color string, e.g., "rgb(45, 234, 237)"
 */
export function hslToRgb(hslColor) {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) {
    return "rgb(97, 175, 239)"; // Fallback to accent-primary
  }

  const h = Number.parseInt(match[1], 10) / 360;
  const s = Number.parseInt(match[2], 10) / 100;
  const l = Number.parseInt(match[3], 10) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/**
 * Generates a neon color in RGB format for use with CSS rgb() or rgba()
 * @param {string} serviceName
 * @returns {string} RGB color string, e.g., "rgb(45, 234, 237)"
 */
export function generateServiceColorRgb(serviceName) {
  const hslColor = generateServiceColor(serviceName);
  return hslToRgb(hslColor);
}

/**
 * Converts hex color to RGB object
 * @param {string} hex - Hex color string (e.g., "#00c0ff")
 * @returns {{r: number, g: number, b: number} | null} RGB values (0-255) or null if invalid
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return null;
  }
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

/**
 * Converts hex color to HSL
 * @param {string} hex - Hex color string (e.g., "#00c0ff")
 * @returns {{h: number, s: number, l: number}} HSL values (h: 0-360, s: 0-100, l: 0-100)
 */
export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return { h: 0, s: 0, l: 50 };
  }

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL to hex color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string
 */
export function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Converts hex color to RGBA string
 * @param {string} hex - Hex color string
 * @param {number} alpha - Alpha value (0-1), default 0.6
 * @returns {string} RGBA color string
 */
export function hexToRgba(hex, alpha = 0.6) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(97, 175, 239, ${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Normalizes a hex color to a specific brightness/intensity.
 * Keeps the hue and saturation but sets a fixed lightness.
 * @param {string} hex - Hex color string
 * @param {number} lightness - Target lightness (0-100), default 65 for neon effect
 * @param {number} saturationMultiplier - Multiplier for saturation (0-1), default 1.0
 * @returns {string} Normalized hex color string
 */
export function normalizeColorBrightness(hex, lightness = 65, saturationMultiplier = 1.0) {
  const hsl = hexToHsl(hex);
  // Reduce saturation and set fixed lightness for consistent, less saturated colors
  const desaturatedSaturation = hsl.s * saturationMultiplier;
  return hslToHex(hsl.h, desaturatedSaturation, lightness);
}

