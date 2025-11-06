/*
 * Palette 6 — Atom One Dark
 * Popular Atom editor dark theme
 */

// Color constants
const PRIMARY = "#e06c75";
const SECONDARY = "#d19a66";
const TERTIARY = "#98c379";
const QUATERNARY = "#56b6c2";
const QUINARY = "#61afef";
const SENARY = "#c678dd";
const LOG_DEBUG = "#5c6370";
const LOG_WARNING = "#e5c07b";
const LOG_CRITICAL = "#be5046";
const BACKGROUND1 = "#282c34";
const BACKGROUND2 = "#21252b";
const BACKGROUND3 = "#1e2127";
const TEXT = "#abb2bf";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#3e4451";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette6 = {
    id: "palette-6",
    label: "Palette 6 — Atom One Dark",
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
        warning: LOG_WARNING,
        error: PRIMARY,
        critical: LOG_CRITICAL,
        event: TERTIARY,
        span: SENARY,
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
        warning: LOG_WARNING,
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

