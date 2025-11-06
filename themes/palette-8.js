/*
 * Palette 8 — Dracula
 * Popular dark theme inspired by Dracula color scheme
 */

// Color constants
const RED = "#ff5555";
const YELLOW = "#f1fa8c";
const GREEN = "#50fa7b";
const CYAN = "#8be9fd";
const PURPLE = "#bd93f9";
const PINK = "#ff79c6";
const LOG_DEBUG = "#6272a4";
const LOG_CRITICAL = "#ff6e6e";
const BACKGROUND1 = "#282a36";
const BACKGROUND2 = "#44475a";
const BACKGROUND3 = "#21222c";
const FOREGROUND = "#f8f8f2";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette8 = {
    id: "palette-8",
    label: "Palette 8 — Dracula",
    palette: {
        primary: RED,
        secondary: YELLOW,
        tertiary: GREEN,
        quaternary: CYAN,
        quinary: PURPLE,
        senary: PINK,
    },

    logging: {
        debug: LOG_DEBUG,
        information: CYAN,
        warning: YELLOW,
        error: RED,
        critical: LOG_CRITICAL,
        event: GREEN,
        span: PURPLE,
    },
    ui: {
        "surface-1": BACKGROUND1,
        "surface-2": BACKGROUND2,
        "surface-3": BACKGROUND3,
        text: FOREGROUND,
        headers: WHITE,
        highlight: HIGHLIGHT,
        border: BACKGROUND2,
        success: GREEN,
        warning: YELLOW,
        info: CYAN,
        danger: RED,
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

