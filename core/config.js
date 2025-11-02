/*
 * Gravibe Configuration
 * Constants, palettes, and default values
 */

export const colorRoles = [
  "accentPrimary",
  "accentSecondary",
  "accentTertiary",
  "accentQuaternary",
  "accentQuinary",
  "accentSenary",
];

export const DEFAULT_RENDERER_MODE = "svg";
export const BACKGROUND_EFFECTS = ["solid", "linear", "radial"];
export const DEFAULT_BACKGROUND_EFFECT = "solid";
export const LIVE_DEFAULT_INTERVAL = 2600;

// Each entry describes a selectable base palette so designers can add new themes quickly.
// Palettes are now defined in individual files under the /themes folder
// The themes/index.js file automatically exports all palettes from the themes folder
import { colorPalettes } from "../themes/index.js";

// Re-export for use throughout the application
export { colorPalettes };

// Log available palettes at module load time for debugging
console.log("[core/config] Loaded", colorPalettes.length, "palettes:", colorPalettes.map(p => p.label).join(", "));

// Shared outline tone so every chart can render the same dark rim as the pie slices.
export const chartOutlineColor = "rgba(15, 23, 42, 0.95)";

// Shared glow/outline state so every renderer reads the same tuning values.
export const effectDefaults = {
  glowIntensity: 1,
  glowOpacity: 0.45,
  outlineScale: 1,
  haloBlur: 28,
  haloOpacity: 0.28,
};

