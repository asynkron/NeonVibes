/*
 * Palette 2 — Cosmic Magenta
 * Improved contrast and normalized brightness/saturation
 */

export const palette2 = {
    id: "palette-2",
    label: "Palette 2 — Cosmic Magenta",
    palette: {
        // Brightened and normalized colors for better contrast
        primary: "#a855f7",      // Bright purple (was #390099 - too dark)
        secondary: "#ec4899",   // Bright magenta/pink (was #9e0059 - too dark)
        tertiary: "#f43f5e",     // Bright coral red (was #ff0054 - adjusted for consistency)
        quaternary: "#06b6d4",   // Bright cyan (was #00c0ff - slightly adjusted)
        quinary: "#fbbf24",      // Bright amber/yellow (was #ffbd00 - adjusted)
        senary: "#8b5cf6",       // Bright violet (replaced duplicate quinary)
    },
    logging: {
        debug: "#6b7280",
        information: "#3b82f6",
        warning: "#f59e0b",
        error: "#f43f5e",        // Matches tertiary
        critical: "#dc2626",
        event: "#ec4899",        // Matches secondary
        span: "#06b6d4",         // Matches quaternary
    },
    ui: {
        // Improved contrast - slightly lighter surfaces for better text visibility
        "surface-1": "#2a2f3d",  // Slightly lighter (was #242933)
        "surface-2": "#232833",  // Slightly lighter (was #1e2129)
        "surface-3": "#1a1e28",  // Slightly lighter (was #12161e)
        text: "#e2e8f0",          // Slightly lighter for better contrast (was #d7dce3)
        headers: "#ffffff",
        highlight: "rgba(255, 255, 255, 0.06)", // Slightly more visible (was 0.05)
        border: "#404755",
    },
};
