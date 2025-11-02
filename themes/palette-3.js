/*
 * Palette 3 — Retro Pop
 * Normalized colors for consistent brightness and saturation
 */

export const palette3 = {
    id: "palette-3",
    label: "Palette 3 — Retro Pop",
    palette: {
        // Normalized to ~65% lightness, ~80% saturation for consistency
        primary: "#f43f5e",      // Bright red (adjusted from #ff595e)
        secondary: "#fbbf24",    // Bright amber (adjusted from #ffca3a)
        tertiary: "#22c55e",    // Bright green (adjusted from #8ac926)
        quaternary: "#06b6d4",   // Cyan (kept from #00c0ff)
        quinary: "#8b5cf6",      // Violet (adjusted from #6a4c93 - brighter)
        senary: "#ec4899",       // Magenta (replaced duplicate)
    },
    logging: {
        debug: "#6b7280",
        information: "#3b82f6",
        warning: "#f59e0b",
        error: "#f43f5e",         // Matches primary
        critical: "#dc2626",
        event: "#22c55e",        // Matches tertiary
        span: "#06b6d4",         // Matches quaternary
    },
    ui: {
        "surface-1": "#242933",
        "surface-2": "#1e2129",
        "surface-3": "#12161e",
        text: "#d7dce3",
        headers: "#ffffff",
        highlight: "rgba(255, 255, 255, 0.05)",
        border: "#3a404c",
    },
};
