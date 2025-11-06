/*
 * Palette 3 — Retro Pop
 * Normalized colors for consistent brightness and saturation
 */

// Color constants
const PRIMARY = "#f43f5e";
const SECONDARY = "#fbbf24";
const TERTIARY = "#22c55e";
const QUATERNARY = "#06b6d4";
const QUINARY = "#8b5cf6";
const SENARY = "#ec4899";
const DEBUG_GRAY = "#6b7280";
const INFO_BLUE = "#3b82f6";
const WARNING_AMBER = "#f59e0b";
const ERROR_RED = "#dc2626";
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

export const palette3 = {
    id: "palette-3",
    label: "Palette 3 — Retro Pop",
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
        error: PRIMARY,
        critical: ERROR_RED,
        event: TERTIARY,
        span: QUATERNARY,
    },
    ui: {
        "surface-1": BACKGROUND1,
        "surface-2": BACKGROUND2,
        "surface-3": BACKGROUND3,
        text: TEXT,
        headers: WHITE,
        highlight: HIGHLIGHT,
        border: BORDER,
        success: TERTIARY,
        warning: WARNING_AMBER,
        info: INFO_BLUE,
        danger: PRIMARY,
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
