/*
 * Palette 1 — Gravibe Sunrise
 * Normalized colors for consistent brightness and saturation
 */

// Color constants
const PRIMARY = "#ef476f";
const SECONDARY = "#fbbf24";
const TERTIARY = "#10b981";
const QUATERNARY = "#06b6d4";
const QUINARY = "#6366f1";
const SENARY = "#8b5cf6";
const LOG_DEBUG = "#6b7280";
const LOG_INFO = "#3b82f6";
const LOG_WARNING = "#f59e0b";
const LOG_ERROR = "#dc2626";
const LOG_CRITICAL = "#dc2626";
const BACKGROUND1 = "#242933";
const BACKGROUND2 = "#1e2129";
const BACKGROUND3 = "#12161e";
const TEXT = "#d7dce3";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#3a404c";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette1 = {
    id: "palette-1",
    label: "Palette 1 — Gravibe Sunrise",
    theme: "dark",
    palette: {
        primary: PRIMARY,
        secondary: SECONDARY,
        tertiary: TERTIARY,
        quaternary: QUATERNARY,
        quinary: QUINARY,
        senary: SENARY,
    },
    logging: {
        debug: LOG_DEBUG,
        information: LOG_INFO,
        warning: LOG_WARNING,
        error: PRIMARY,
        critical: LOG_CRITICAL,
        event: TERTIARY,
        span: QUATERNARY,
    },
    ui: {
        surface: BACKGROUND1,
        text: TEXT,
        headers: WHITE,
        highlight: HIGHLIGHT,
        border: BORDER,
        success: TERTIARY,
        warning: LOG_WARNING,
        info: LOG_INFO,
        danger: PRIMARY,
        muted: LOG_DEBUG,
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
