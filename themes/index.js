/*
 * Theme Palettes Index
 * Automatically exports all available color palettes from palette-*.js files
 * 
 * To add a new palette:
 * 1. Create a new file palette-N.js in this directory
 * 2. Export a paletteN object with id, label, palette, logging, and ui properties
 * 3. It will automatically appear in the theme picker!
 */

// Import all palette files
import { palette1 } from "./palette-1.js";
import { palette2 } from "./palette-2.js";
import { palette3 } from "./palette-3.js";
import { palette4 } from "./palette-4.js";
import { palette5 } from "./palette-5.js";
import { palette6 } from "./palette-6.js";
import { palette7 } from "./palette-7.js";
import { palette8 } from "./palette-8.js";
import { palette9 } from "./palette-9.js";
import { palette10 } from "./palette-10.js";
import { palette11 } from "./palette-11.js";
import { palette12 } from "./palette-12.js";
import { palette13 } from "./palette-13.js";
import { palette14 } from "./palette-14.js";
import { palette15 } from "./palette-15.js";
import { palette16 } from "./palette-16.js";
import { palette17 } from "./palette-17.js";
import { palette18 } from "./palette-18.js";
import { palette19 } from "./palette-19.js";
import { palette20 } from "./palette-20.js";

// Export individual palettes
export { palette1, palette2, palette3, palette4, palette5, palette6, palette7, palette8, palette9, palette10, palette11, palette12, palette13, palette14, palette15, palette16, palette17, palette18, palette19, palette20 };

// Array of all palettes for easy iteration - automatically includes all palettes
// When adding new palettes, just add them to this array!
export const colorPalettes = [
    palette1,
    palette2,
    palette3,
    palette4,
    palette5,
    palette6,
    palette7,
    palette8,
    palette9,
    palette10,
    palette11,
    palette12,
    palette13,
    palette14,
    palette15,
    palette16,
    palette17,
    palette18,
    palette19,
    palette20
];

// Log for debugging
console.log("[themes/index] Exported", colorPalettes.length, "palettes");
