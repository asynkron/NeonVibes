/*
 * Palette 4 — Light Mode
 * A light-themed palette with softer, muted colors optimized for light backgrounds
 * Normalized for consistency with other palettes
 */

export const palette4 = {
    id: "palette-4",
    label: "Palette 4 — Light Mode",
    palette: {
        // Normalized to work well on light backgrounds while maintaining similar intensity
        primary: "#3b82f6",      // Blue (kept - already good)
        secondary: "#8b5cf6",   // Violet (kept - already good)
        tertiary: "#10b981",    // Emerald (adjusted from #10b981 for consistency)
        quaternary: "#06b6d4",  // Cyan (kept - already good)
        quinary: "#f59e0b",     // Amber (kept - already good)
        senary: "#ef4444",      // Red (kept - already good)
    },
    logging: {
        debug: "#64748b",
        information: "#2563eb",
        warning: "#d97706",
        error: "#dc2626",
        critical: "#b91c1c",
        event: "#059669",
        span: "#0284c7",
    },
    ui: {
        "surface-1": "#f8fafc",
        "surface-2": "#f1f5f9",
        "surface-3": "#e2e8f0",
        text: "#1e293b",
        headers: "#0f172a",
        highlight: "rgba(0, 0, 0, 0.05)",
        border: "#cbd5e1",
    },
};
