/*
 * Palette 10 — Solarized Dark
 * Popular carefully designed dark theme
 */

// Color constants
const PRIMARY = "#dc322f";
const SECONDARY = "#cb4b16";
const TERTIARY = "#859900";
const QUATERNARY = "#2aa198";
const QUINARY = "#268bd2";
const SENARY = "#6c71c4";
const DEBUG_GRAY = "#586e75";
const WARNING_YELLOW = "#b58900";
const BACKGROUND1 = "#002b36";
const BACKGROUND2 = "#073642";
const BACKGROUND3 = "#0a2933";
const TEXT = "#a0a9a9";
const HEADERS = "#fdf6e3";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#073642";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette10 = {
    id: "palette-10",
    label: "Palette 10 — Solarized Dark",
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
        warning: WARNING_YELLOW,
        error: PRIMARY,
        critical: SECONDARY,
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
        warning: WARNING_YELLOW,
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
