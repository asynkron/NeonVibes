/*
 * Palette 4 — Light Mode
 * A light-themed palette with softer, muted colors optimized for light backgrounds
 * Normalized for consistency with other palettes
 */

// Color constants
const PRIMARY = "#3b82f6";
const SECONDARY = "#8b5cf6";
const TERTIARY = "#10b981";
const QUATERNARY = "#06b6d4";
const QUINARY = "#f59e0b";
const SENARY = "#ef4444";
const DEBUG_GRAY = "#64748b";
const INFO_BLUE = "#2563eb";
const WARNING_AMBER = "#d97706";
const ERROR_RED = "#dc2626";
const CRITICAL_RED = "#b91c1c";
const EVENT_GREEN = "#059669";
const SPAN_BLUE = "#0284c7";
const BACKGROUND1 = "#f8fafc";
const BACKGROUND2 = "#f1f5f9";
const BACKGROUND3 = "#e2e8f0";
const TEXT = "#1e293b";
const HEADERS = "#0f172a";
const HIGHLIGHT = "rgba(0, 0, 0, 0.05)";
const BORDER = "#cbd5e1";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette4 = {
    id: "palette-4",
    label: "Palette 4 — Light Mode",
    palette: {
        primary: PRIMARY,
        secondary: SECONDARY,
        tertiary: TERTIARY,
        quaternary: QUATERNARY,
        quinary: QUINARY,
        senary: SENARY,
    },
    logging: {
        debug: DEBUG_GRAY,
        information: INFO_BLUE,
        warning: WARNING_AMBER,
        error: ERROR_RED,
        critical: CRITICAL_RED,
        event: EVENT_GREEN,
        span: SPAN_BLUE,
    },
    ui: {
        "surface-1": BACKGROUND1,
        "surface-2": BACKGROUND2,
        "surface-3": BACKGROUND3,
        text: TEXT,
        headers: HEADERS,
        highlight: HIGHLIGHT,
        border: BORDER,
        success: TERTIARY,
        warning: WARNING_AMBER,
        info: INFO_BLUE,
        danger: ERROR_RED,
        muted: DEBUG_GRAY,
    },
    components: {
        "start": COMPONENT_TEAL,
        "database": COMPONENT_ORANGE,
        "queue": COMPONENT_ORANGE,
        "database-statement": COMPONENT_GRAY,
        "workflow": COMPONENT_GREEN,
        "actor": COMPONENT_GREEN,
        "activity": COMPONENT_BLUE,
        "queue-consumer": COMPONENT_BLUE,
        "endpoint": COMPONENT_BLUE,
        "service": COMPONENT_PURPLE,
        "subcomponent": COMPONENT_DARK_GRAY,
    },
};
