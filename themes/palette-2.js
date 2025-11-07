/*
 * Palette 2 — Cosmic Magenta
 * Improved contrast and normalized brightness/saturation
 */

// Color constants
const PRIMARY = "#a855f7";
const SECONDARY = "#ec4899";
const TERTIARY = "#f43f5e";
const QUATERNARY = "#06b6d4";
const QUINARY = "#fbbf24";
const SENARY = "#8b5cf6";
const LOG_DEBUG = "#6b7280";
const LOG_INFO = "#3b82f6";
const LOG_WARNING = "#f59e0b";
const LOG_ERROR = "#dc2626";
const LOG_CRITICAL = "#dc2626";
const BACKGROUND1 = "#2a2f3d";
const BACKGROUND2 = "#232833";
const BACKGROUND3 = "#1a1e28";
const TEXT = "#e2e8f0";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.06)";
const BORDER = "#404755";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette2 = {
    id: "palette-2",
    label: "Palette 2 — Cosmic Magenta",
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
        error: TERTIARY,
        critical: LOG_CRITICAL,
        event: SECONDARY,
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
        danger: TERTIARY,
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
