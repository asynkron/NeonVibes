/*
 * Palette 19 — Rose Pine Dawn
 * Elegant light theme with warm tones
 */

// Color constants
const PRIMARY = "#b4637a";
const SECONDARY = "#ea9d34";
const TERTIARY = "#56949f";
const QUATERNARY = "#286983";
const QUINARY = "#907aa9";
const SENARY = "#d7827e";
const LOG_DEBUG = "#9893a5";
const LOG_CRITICAL = "#c05761";
const BACKGROUND1 = "#faf4ed";
const BACKGROUND2 = "#fffaf3";
const BACKGROUND3 = "#f2e9e1";
const TEXT = "#575279";
const HEADERS = "#1f1d2e";
const HIGHLIGHT = "rgba(0, 0, 0, 0.05)";
const BORDER = "#dfdad9";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette19 = {
    id: "palette-19",
    label: "Palette 19 — Rose Pine Dawn",
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
