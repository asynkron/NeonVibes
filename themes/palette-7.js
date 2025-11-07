/*
 * Palette 7 — Gruvbox
 * Retro groove color scheme popular in Vim/terminal editors
 */

// Color constants
const PRIMARY = "#fb4934";
const SECONDARY = "#fe8019";
const TERTIARY = "#b8bb26";
const QUATERNARY = "#83a598";
const QUINARY = "#458588";
const SENARY = "#d3869b";
const LOG_DEBUG = "#928374";
const LOG_WARNING = "#fabd2f";
const LOG_CRITICAL = "#cc241d";
const BACKGROUND1 = "#282828";
const BACKGROUND2 = "#3c3836";
const BACKGROUND3 = "#1d2021";
const TEXT = "#ebdbb2";
const HEADERS = "#fbf1c7";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#504945";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette7 = {
    id: "palette-7",
    label: "Palette 7 — Gruvbox",
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
        warning: LOG_WARNING,
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

