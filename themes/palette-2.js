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
const DEBUG_GRAY = "#6b7280";
const INFO_BLUE = "#3b82f6";
const WARNING_AMBER = "#f59e0b";
const ERROR_RED = "#dc2626";
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
        error: TERTIARY,
        critical: ERROR_RED,
        event: SECONDARY,
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
        danger: TERTIARY,
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
