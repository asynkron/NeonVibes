/*
 * Gravibe Palette Management
 * Color utilities and palette state management
 */

import { colorRoles, colorPalettes } from "./config.js";

export const paletteState = {
    activeMapping: {},
    activeId: colorPalettes.find(p => p.id === "palette-5")?.id ?? colorPalettes[0]?.id ?? "",
};

// This will be set by setup/components.js to avoid circular dependency
let rerenderCallback = null;

export function setRerenderCallback(callback) {
    rerenderCallback = callback;
}

function hexToRgb(hex) {
    const trimmed = hex.replace(/^#/, "");
    const bigint = parseInt(trimmed, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

function toCssVar(role) {
    return `--${role.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
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
            // Convert "surface-1" to "uiSurface1" for mapping
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
    // Convert "surface-1" to "uiSurface1" for mapping lookup
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

    // Set CSS variables for logging colors
    if (palette.logging) {
        Object.entries(palette.logging).forEach(([level, color]) => {
            const cssVar = `--logging-${level}`;
            const rgbVar = `--logging-${level}-rgb`;
            const { r, g, b } = hexToRgb(color);
            root.style.setProperty(cssVar, color);
            root.style.setProperty(rgbVar, `${r} ${g} ${b}`);
        });
    }

    // Set CSS variables for UI colors
    if (palette.ui) {
        Object.entries(palette.ui).forEach(([key, color]) => {
            const cssVar = `--ui-${key}`;
            root.style.setProperty(cssVar, color);
            
            // For rgba colors like highlight, don't generate rgb variant
            // For hex colors, generate rgb variant
            if (color.startsWith("#")) {
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

    if (rerenderCallback) {
        rerenderCallback();
    }
}

