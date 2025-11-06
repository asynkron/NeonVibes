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
const DEBUG_GRAY = "#707a8c";
const CRITICAL_RED = "#ff3333";
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
        information: QUINARY,
        warning: SECONDARY,
        error: PRIMARY,
        critical: CRITICAL_RED,
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
        warning: SECONDARY,
        info: QUINARY,
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
