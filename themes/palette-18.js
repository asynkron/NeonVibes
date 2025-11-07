/*
 * Palette 18 — Ayu Light
 * Popular modern light theme with balanced colors
 */

// Color constants
const PRIMARY = "#f07178";
const SECONDARY = "#fa8d3e";
const TERTIARY = "#86b300";
const QUATERNARY = "#4cbf99";
const QUINARY = "#36a3d9";
const SENARY = "#a37acc";
const LOG_DEBUG = "#8b94a3";
const LOG_CRITICAL = "#d81e00";
const BACKGROUND1 = "#fafafa";
const BACKGROUND2 = "#f5f5f5";
const BACKGROUND3 = "#e8e8e8";
const TEXT = "#5c6773";
const HEADERS = "#0d0e0f";
const HIGHLIGHT = "rgba(0, 0, 0, 0.05)";
const BORDER = "#d4d4d4";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette18 = {
    id: "palette-18",
    label: "Palette 18 — Ayu Light",
    theme: "light",
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
        information: QUINARY,
        warning: SECONDARY,
        error: PRIMARY,
        critical: LOG_CRITICAL,
        event: TERTIARY,
        span: QUATERNARY,
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
        warning: SECONDARY,
        info: QUINARY,
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
