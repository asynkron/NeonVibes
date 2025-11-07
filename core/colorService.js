/**
 * Color Service
 * Centralized color computation and mixing utilities
 * Used across trace viewer, sequence diagram, and trace preview
 */

import { getPaletteColors } from "./palette.js";
import { normalizeColorBrightness, hexToRgb } from "./colors.js";

/**
 * Computes a service color from a color key using the trace's serviceNameMapping.
 * Uses palette colors with normalization for consistent appearance.
 * @param {string} colorKey - Color key (groupName || serviceName) to look up in serviceNameMapping
 * @param {import("../ui/trace.js").TraceModel} trace - Trace model with serviceNameMapping
 * @returns {string} Normalized hex color string
 */
export function computeServiceColor(colorKey, trace) {
  const paletteColors = getPaletteColors();
  if (paletteColors.length === 0) {
    return "#61afef"; // Fallback
  }
  
  const serviceIndex = trace.serviceNameMapping?.get(colorKey) ?? 0;
  const colorIndex = serviceIndex % paletteColors.length;
  const paletteColor = paletteColors[colorIndex];
  
  if (!paletteColor) {
    return "#61afef"; // Fallback
  }
  
  return normalizeColorBrightness(paletteColor, 50, 0.7);
}

/**
 * Computes a service color and returns as RGB object.
 * @param {string} colorKey - Color key (groupName || serviceName) to look up
 * @param {import("../ui/trace.js").TraceModel} trace - Trace model with serviceNameMapping
 * @returns {{r: number, g: number, b: number} | null} RGB values or null if invalid
 */
export function computeServiceColorRgb(colorKey, trace) {
  const color = computeServiceColor(colorKey, trace);
  return hexToRgb(color);
}

// Cache for CSS variable lookups (per render pass)
let _surface1Cache = null;
let _surface1CacheFrame = -1;

/**
 * Gets the surface color from CSS variable, with caching per animation frame.
 * @param {string} surfaceVar - CSS variable name (default: '--ui-surface')
 * @returns {{r: number, g: number, b: number} | null} RGB values or null if invalid
 */
function getSurfaceColor(surfaceVar = '--ui-surface') {
  // Cache per animation frame to avoid repeated getComputedStyle calls
  const currentFrame = performance.now();
  if (_surface1Cache === null || currentFrame - _surface1CacheFrame > 16) { // ~60fps
    const rootStyles = getComputedStyle(document.documentElement);
    const surfaceValue = rootStyles.getPropertyValue(surfaceVar).trim() || '#1e2129';
    const surfaceRgb = hexToRgb(surfaceValue);
    if (surfaceRgb) {
      _surface1Cache = surfaceRgb;
      _surface1CacheFrame = currentFrame;
    } else {
      // Fallback to default dark background if parsing fails
      _surface1Cache = hexToRgb('#1e2129');
      _surface1CacheFrame = currentFrame;
    }
  }
  return _surface1Cache;
}

/**
 * Mixes a color with a CSS variable (typically --ui-surface).
 * @param {string} colorHex - Hex color string to mix
 * @param {string} surfaceVar - CSS variable name (default: '--ui-surface')
 * @param {number} ratio - Mix ratio (0-1), where 0 = all colorHex, 1 = all surface (default: 0.75)
 * @returns {{r: number, g: number, b: number} | null} Mixed RGB values or null if invalid
 */
export function mixWithSurface(colorHex, surfaceVar = '--ui-surface', ratio = 0.75) {
  const colorRgb = hexToRgb(colorHex);
  if (!colorRgb) {
    return null;
  }
  
  // Use cached surface color
  const surfaceRgb = getSurfaceColor(surfaceVar);
  if (!surfaceRgb) {
    return null;
  }
  
  return mixColors(colorRgb, surfaceRgb, ratio);
}

/**
 * Mixes two RGB colors by blending them together.
 * @param {{r: number, g: number, b: number}} color1 - First RGB color
 * @param {{r: number, g: number, b: number}} color2 - Second RGB color
 * @param {number} ratio - Blend ratio (0-1), where 0 = all color1, 1 = all color2, 0.5 = 50/50 blend
 * @returns {{r: number, g: number, b: number}} Mixed RGB color
 */
function mixColors(color1, color2, ratio = 0.5) {
  const invRatio = 1 - ratio;
  return {
    r: Math.round(color1.r * invRatio + color2.r * ratio),
    g: Math.round(color1.g * invRatio + color2.g * ratio),
    b: Math.round(color1.b * invRatio + color2.b * ratio),
  };
}

