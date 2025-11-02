/*
 * Palette 1 — Gravibe Sunrise
 * Normalized colors for consistent brightness and saturation
 */

export const palette1 = {
    id: "palette-1",
    label: "Palette 1 — Gravibe Sunrise",
    palette: {
        // Normalized to ~65% lightness, ~80% saturation for consistency
        primary: "#ef476f",      // Pink/coral (kept - already good)
        secondary: "#fbbf24",    // Amber/yellow (adjusted from #ffd166 for consistency)
        tertiary: "#10b981",    // Emerald green (adjusted from #06d6a0)
        quaternary: "#06b6d4",  // Cyan (adjusted from #00c0ff)
        quinary: "#6366f1",      // Indigo (replaced dark #073b4c - too dark for accent)
        senary: "#8b5cf6",       // Violet (replaced dark #073b4c)
    },
    logging: {
        debug: "#6b7280",
        information: "#3b82f6",
        warning: "#f59e0b",
        error: "#ef476f",        // Matches primary
        critical: "#dc2626",
        event: "#10b981",        // Matches tertiary
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
