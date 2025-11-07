/*
 * Gravibe Palette Management
 * Color utilities and palette state management
 */

import { colorRoles, colorPalettes } from "./config.js";
import { hexToHsl, hslToHex, hexToRgb } from "./colors.js";

export const paletteState = {
    activeMapping: {},
    activeId: colorPalettes.find(p => p.id === "palette-5")?.id ?? colorPalettes[0]?.id ?? "",
};

// This will be set by setup/components.js to avoid circular dependency
let rerenderCallback = null;

export function setRerenderCallback(callback) {
    rerenderCallback = callback;
}

function toCssVar(role) {
    return `--${role.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

/**
 * Mixes a color towards the surface color for positive variations.
 * @param {string} hex - Base hex color
 * @param {string} surfaceHex - Surface color hex
 * @param {number} steps - Number of steps (1, 2, or 3)
 * @param {number} stepSize - Amount to mix per step (default 2.5, converted to ratio)
 * @returns {string} Mixed hex color
 */
function mixColorTowardsSurface(hex, surfaceHex, steps, stepSize = 2.5) {
    if (!hex || !hex.startsWith("#") || !surfaceHex || !surfaceHex.startsWith("#")) {
        return hex;
    }

    const colorRgb = hexToRgb(hex);
    const surfaceRgb = hexToRgb(surfaceHex);

    if (!colorRgb || !surfaceRgb) {
        return hex;
    }

    // Map steps to mix ratios
    // For positive-1: mix 15% towards surface
    // For positive-2: mix 30% towards surface
    // For positive-3: mix 45% towards surface
    const mixRatios = {
        1: 0.15,
        2: 0.30,
        3: 0.45
    };
    const mixRatio = mixRatios[steps] || 0.15;
    const clampedRatio = Math.max(0, Math.min(1, mixRatio));

    // Mix the colors
    const r = Math.round(colorRgb.r * (1 - clampedRatio) + surfaceRgb.r * clampedRatio);
    const g = Math.round(colorRgb.g * (1 - clampedRatio) + surfaceRgb.g * clampedRatio);
    const b = Math.round(colorRgb.b * (1 - clampedRatio) + surfaceRgb.b * clampedRatio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generates color variations (lighter/darker) based on theme
 * @param {string} hex - Base hex color
 * @param {string} theme - "light" or "dark"
 * @param {number} steps - Number of steps (positive = lighter for light mode/darker for dark mode)
 * @param {number} stepSize - Amount to adjust per step (default 2.5)
 * @returns {string} Adjusted hex color
 */
function generateColorVariation(hex, theme, steps, stepSize = 2.5) {
    if (!hex || !hex.startsWith("#")) {
        return hex;
    }

    const hsl = hexToHsl(hex);
    if (!hsl) {
        return hex;
    }

    let adjustedLightness = hsl.l;

    if (theme === "light") {
        // For light mode: positive = lighter (increase lightness), negative = darker (decrease lightness)
        adjustedLightness = hsl.l + (steps * stepSize);
    } else {
        // For dark mode: positive = darker (decrease lightness), negative = lighter (increase lightness)
        adjustedLightness = hsl.l - (steps * stepSize);
    }

    // Clamp lightness between 0 and 100
    adjustedLightness = Math.max(0, Math.min(100, adjustedLightness));

    return hslToHex(hsl.h, hsl.s, adjustedLightness);
}

export function resolveColor(colorRef) {
    if (!colorRef) {
        return colorRef;
    }

    if (paletteState.activeMapping[colorRef]) {
        return paletteState.activeMapping[colorRef];
    }

    return colorRef;
}

export function colorWithAlpha(colorRef, alpha) {
    const color = resolveColor(colorRef);
    if (!color) {
        return color;
    }

    if (color.startsWith("#")) {
        const { r, g, b } = hexToRgb(color);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const rgbaMatch = color.match(/rgba?\(([^)]+)\)/);
    if (rgbaMatch) {
        const [r, g, b] = rgbaMatch[1]
            .split(",")
            .map((part) => parseFloat(part.trim()))
            .slice(0, 3);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return color;
}

function buildPaletteMapping(palette) {
    const mapping = {};

    // Map palette colors (primary, secondary, etc.) to accent roles for backward compatibility
    if (palette.palette) {
        const paletteColorMap = {
            primary: "accentPrimary",
            secondary: "accentSecondary",
            tertiary: "accentTertiary",
            quaternary: "accentQuaternary",
            quinary: "accentQuinary",
            senary: "accentSenary",
        };

        Object.entries(paletteColorMap).forEach(([key, role]) => {
            if (palette.palette[key]) {
                mapping[role] = palette.palette[key];
            }
        });
    }

    // Map logging colors
    if (palette.logging) {
        Object.entries(palette.logging).forEach(([level, color]) => {
            mapping[`logging${level.charAt(0).toUpperCase() + level.slice(1)}`] = color;
        });
    }

    // Map UI colors
    if (palette.ui) {
        Object.entries(palette.ui).forEach(([key, color]) => {
            // Convert "surface" to "uiSurface" for mapping
            const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            mapping[`ui${camelKey.charAt(0).toUpperCase() + camelKey.slice(1)}`] = color;
        });
    }

    // Backward compatibility: if palette has old 'colors' array, map by index
    if (!palette.palette && palette.colors && Array.isArray(palette.colors)) {
        colorRoles.forEach((role, index) => {
            const color = palette.colors[index % palette.colors.length];
            mapping[role] = color;
        });
    }

    return mapping;
}

// Initialize with first palette
if (colorPalettes[0]) {
    paletteState.activeMapping = buildPaletteMapping(colorPalettes[0]);
}

export function getLoggingColor(level) {
    const normalizedLevel = level?.toLowerCase();
    const mappingKey = `logging${normalizedLevel?.charAt(0).toUpperCase() + normalizedLevel?.slice(1) || ""}`;
    return paletteState.activeMapping[mappingKey] || paletteState.activeMapping[`logging${level}`] || null;
}

export function getPaletteColor(name) {
    const paletteColorMap = {
        primary: "accentPrimary",
        secondary: "accentSecondary",
        tertiary: "accentTertiary",
        quaternary: "accentQuaternary",
        quinary: "accentQuinary",
        senary: "accentSenary",
    };
    const role = paletteColorMap[name] || name;
    return paletteState.activeMapping[role] || null;
}

export function getUIColor(name) {
    // Convert "surface" to "uiSurface" for mapping lookup
    const camelKey = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const mappingKey = `ui${camelKey.charAt(0).toUpperCase() + camelKey.slice(1)}`;
    return paletteState.activeMapping[mappingKey] || null;
}

/**
 * Gets palette colors from CSS variables.
 * Reads from inline styles first (fastest, most up-to-date), then falls back to computed styles.
 * @returns {string[]} Array of palette color hex values
 */
export function getPaletteColors() {
    const root = document.documentElement;
    // Use the same color roles that applyPalette uses
    const colors = colorRoles.map((role) => {
        // Convert role name to CSS variable (same as toCssVar)
        const cssVar = `--${role.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
        // First try to read from inline style (set by applyPalette) - this is immediate
        let value = root.style.getPropertyValue(cssVar).trim();
        // If not found in inline style, fall back to computed style
        if (!value) {
            const style = getComputedStyle(root);
            value = style.getPropertyValue(cssVar).trim();
        }
        // Filter out empty values
        return value || null;
    }).filter(Boolean);
    // Return non-empty colors only, or fallback palette
    return colors.length > 0 ? colors : ["#00c0ff", "#9b59b6", "#2ecc71", "#f39c12", "#e74c3c", "#3498db"];
}

export function applyPalette(palette) {
    console.log("[applyPalette] Called with palette:", palette.id);
    const mapping = buildPaletteMapping(palette);
    paletteState.activeMapping = mapping;
    paletteState.activeId = palette.id;

    const root = document.documentElement;
    const theme = palette.theme || "dark";

    // Get surface color for mixing positive variations
    const surfaceColor = palette.ui?.surface || "#1e2129";

    // Generate color variations for palette colors
    const paletteColorMap = {
        primary: "primary",
        secondary: "secondary",
        tertiary: "tertiary",
        quaternary: "quaternary",
        quinary: "quinary",
        senary: "senary",
    };

    // Generate variations for each palette color
    if (palette.palette) {
        Object.entries(paletteColorMap).forEach(([key, name]) => {
            const baseColor = palette.palette[key];
            if (baseColor && baseColor.startsWith("#")) {
                // Generate positive variations by mixing towards surface color
                const positive3 = mixColorTowardsSurface(baseColor, surfaceColor, 3, 2.5);
                const positive2 = mixColorTowardsSurface(baseColor, surfaceColor, 2, 2.5);
                const positive1 = mixColorTowardsSurface(baseColor, surfaceColor, 1, 2.5);

                // Base color
                const base = baseColor;

                // Generate negative variations (darker for dark mode, lighter for light mode)
                const negative1 = generateColorVariation(baseColor, theme, -1, 2.5);
                const negative2 = generateColorVariation(baseColor, theme, -2, 2.5);
                const negative3 = generateColorVariation(baseColor, theme, -3, 2.5);

                // Set CSS variables
                root.style.setProperty(`--${name}-positive-3`, positive3);
                root.style.setProperty(`--${name}-positive-2`, positive2);
                root.style.setProperty(`--${name}-positive-1`, positive1);
                root.style.setProperty(`--${name}`, base);
                root.style.setProperty(`--${name}-negative-1`, negative1);
                root.style.setProperty(`--${name}-negative-2`, negative2);
                root.style.setProperty(`--${name}-negative-3`, negative3);

                // Generate RGB variants for all variations
                const variations = [
                    { name: `${name}-positive-3`, color: positive3 },
                    { name: `${name}-positive-2`, color: positive2 },
                    { name: `${name}-positive-1`, color: positive1 },
                    { name: name, color: base },
                    { name: `${name}-negative-1`, color: negative1 },
                    { name: `${name}-negative-2`, color: negative2 },
                    { name: `${name}-negative-3`, color: negative3 },
                ];

                variations.forEach(({ name: varName, color: colorValue }) => {
                    try {
                        const { r, g, b } = hexToRgb(colorValue);
                        root.style.setProperty(`--${varName}-rgb`, `${r} ${g} ${b}`);
                    } catch (e) {
                        // Skip rgb variant if color conversion fails
                    }
                });
            }
        });
    }

    // Set base accent colors for backward compatibility
    colorRoles.forEach((role) => {
        const cssVar = toCssVar(role);
        const rgbVar = `${cssVar}-rgb`;
        const color = mapping[role];
        if (color) {
            const { r, g, b } = hexToRgb(color);
            root.style.setProperty(cssVar, color);
            root.style.setProperty(rgbVar, `${r} ${g} ${b}`);
        }
    });

    // Set CSS variables for logging colors with variations
    if (palette.logging) {
        Object.entries(palette.logging).forEach(([level, color]) => {
            if (color && color.startsWith("#")) {
                // Generate positive variations by mixing towards surface color
                const positive3 = mixColorTowardsSurface(color, surfaceColor, 3, 2.5);
                const positive2 = mixColorTowardsSurface(color, surfaceColor, 2, 2.5);
                const positive1 = mixColorTowardsSurface(color, surfaceColor, 1, 2.5);
                const base = color;
                const negative1 = generateColorVariation(color, theme, -1, 2.5);
                const negative2 = generateColorVariation(color, theme, -2, 2.5);
                const negative3 = generateColorVariation(color, theme, -3, 2.5);

                // Set CSS variables
                root.style.setProperty(`--logging-${level}-positive-3`, positive3);
                root.style.setProperty(`--logging-${level}-positive-2`, positive2);
                root.style.setProperty(`--logging-${level}-positive-1`, positive1);
                root.style.setProperty(`--logging-${level}`, base);
                root.style.setProperty(`--logging-${level}-negative-1`, negative1);
                root.style.setProperty(`--logging-${level}-negative-2`, negative2);
                root.style.setProperty(`--logging-${level}-negative-3`, negative3);
            } else {
                // Non-hex colors (fallback)
                const cssVar = `--logging-${level}`;
                root.style.setProperty(cssVar, color);
            }

            // Set RGB variant for base color
            if (color && color.startsWith("#")) {
                try {
                    const { r, g, b } = hexToRgb(color);
                    const rgbVar = `--logging-${level}-rgb`;
                    root.style.setProperty(rgbVar, `${r} ${g} ${b}`);
                } catch (e) {
                    // Skip rgb variant if color conversion fails
                }
            }
        });
    }

    // Set CSS variables for UI colors with variations
    if (palette.ui) {
        Object.entries(palette.ui).forEach(([key, color]) => {
            // Skip variations for non-color values like "highlight" (rgba)
            const skipVariations = key === "highlight" || !color.startsWith("#");

            if (!skipVariations && color && color.startsWith("#")) {
                // Declare variables in outer scope
                let positive3, positive2, positive1, base, negative1, negative2, negative3;

                // For surface, use normal lightness adjustment with smaller steps
                // For all other UI colors, mix towards surface color for positive variations
                if (key === "surface") {
                    // Generate variations using normal lightness adjustment with smaller step size (1.25 instead of 2.5)
                    positive3 = generateColorVariation(color, theme, 3, 1.25);
                    positive2 = generateColorVariation(color, theme, 2, 1.25);
                    positive1 = generateColorVariation(color, theme, 1, 1.25);
                    base = color;
                    negative1 = generateColorVariation(color, theme, -1, 1.25);
                    negative2 = generateColorVariation(color, theme, -2, 1.25);
                    negative3 = generateColorVariation(color, theme, -3, 1.25);
                } else {
                    // Generate positive variations by mixing towards surface color
                    positive3 = mixColorTowardsSurface(color, surfaceColor, 3, 2.5);
                    positive2 = mixColorTowardsSurface(color, surfaceColor, 2, 2.5);
                    positive1 = mixColorTowardsSurface(color, surfaceColor, 1, 2.5);
                    base = color;
                    negative1 = generateColorVariation(color, theme, -1, 2.5);
                    negative2 = generateColorVariation(color, theme, -2, 2.5);
                    negative3 = generateColorVariation(color, theme, -3, 2.5);
                }

                // Set CSS variables
                root.style.setProperty(`--ui-${key}-positive-3`, positive3);
                root.style.setProperty(`--ui-${key}-positive-2`, positive2);
                root.style.setProperty(`--ui-${key}-positive-1`, positive1);
                root.style.setProperty(`--ui-${key}`, base);
                root.style.setProperty(`--ui-${key}-negative-1`, negative1);
                root.style.setProperty(`--ui-${key}-negative-2`, negative2);
                root.style.setProperty(`--ui-${key}-negative-3`, negative3);
            } else {
                // Non-hex colors or skip variations
                const cssVar = `--ui-${key}`;
                root.style.setProperty(cssVar, color);
            }

            // For rgba colors like highlight, don't generate rgb variant
            // For hex colors, generate rgb variant
            if (color && color.startsWith("#")) {
                try {
                    const { r, g, b } = hexToRgb(color);
                    const rgbVar = `--ui-${key}-rgb`;
                    root.style.setProperty(rgbVar, `${r} ${g} ${b}`);
                } catch (e) {
                    // Skip rgb variant if color conversion fails
                }
            }
        });
    }

    // Set CSS variables for component colors with variations
    if (palette.components) {
        Object.entries(palette.components).forEach(([key, color]) => {
            if (color && color.startsWith("#")) {
                // Generate positive variations by mixing towards surface color
                const positive3 = mixColorTowardsSurface(color, surfaceColor, 3, 2.5);
                const positive2 = mixColorTowardsSurface(color, surfaceColor, 2, 2.5);
                const positive1 = mixColorTowardsSurface(color, surfaceColor, 1, 2.5);
                const base = color;
                const negative1 = generateColorVariation(color, theme, -1, 2.5);
                const negative2 = generateColorVariation(color, theme, -2, 2.5);
                const negative3 = generateColorVariation(color, theme, -3, 2.5);

                // Set CSS variables
                root.style.setProperty(`--component-${key}-positive-3`, positive3);
                root.style.setProperty(`--component-${key}-positive-2`, positive2);
                root.style.setProperty(`--component-${key}-positive-1`, positive1);
                root.style.setProperty(`--component-${key}`, base);
                root.style.setProperty(`--component-${key}-negative-1`, negative1);
                root.style.setProperty(`--component-${key}-negative-2`, negative2);
                root.style.setProperty(`--component-${key}-negative-3`, negative3);
            } else {
                // Non-hex colors (fallback)
                const cssVar = `--component-${key}`;
                root.style.setProperty(cssVar, color);
            }

            if (color && color.startsWith("#")) {
                try {
                    const { r, g, b } = hexToRgb(color);
                    const rgbVar = `--component-${key}-rgb`;
                    root.style.setProperty(rgbVar, `${r} ${g} ${b}`);
                } catch (e) {
                    // Skip rgb variant if color conversion fails
                }
            }
        });
    }

    if (rerenderCallback) {
        rerenderCallback();
    }
}

