/*
 * Palette 17 — Rose Pine Dark
 * Elegant dark theme with warm tones
 */

// Color constants
const PRIMARY = "#eb6f92";
const SECONDARY = "#f6c177";
const TERTIARY = "#9ccfd8";
const QUATERNARY = "#31748f";
const QUINARY = "#c4a7e7";
const SENARY = "#ebbcba";
const LOG_DEBUG = "#6e6a86";
const LOG_CRITICAL = "#b4637a";
const BACKGROUND1 = "#191724";
const BACKGROUND2 = "#1f1d2e";
const BACKGROUND3 = "#26233a";
const TEXT = "#e0def4";
const HEADERS = "#faf4ed";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#403d52";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette17 = {
    id: "palette-17",
    label: "Palette 17 — Rose Pine Dark",
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
        information: QUATERNARY,
        warning: SECONDARY,
        error: PRIMARY,
        critical: LOG_CRITICAL,
        event: TERTIARY,
        span: QUINARY,
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
        info: QUATERNARY,
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
