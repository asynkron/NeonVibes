/*
 * Palette 16 — Ayu Dark
 * Popular modern dark theme with balanced colors
 */

// Color constants
const PRIMARY = "#f28779";
const SECONDARY = "#ffcc66";
const TERTIARY = "#bae67e";
const QUATERNARY = "#5ccfe6";
const QUINARY = "#73d0ff";
const SENARY = "#d4bfff";
const LOG_DEBUG = "#707a8c";
const LOG_CRITICAL = "#ff3333";
const BACKGROUND1 = "#1f2430";
const BACKGROUND2 = "#252936";
const BACKGROUND3 = "#191e2a";
const TEXT = "#cbccc6";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#334155";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette16 = {
    id: "palette-16",
    label: "Palette 16 — Ayu Dark",
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
        information: QUINARY,
        warning: SECONDARY,
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
