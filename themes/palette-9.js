/*
 * Palette 9 — Nord
 * Popular polar-inspired dark theme
 */

// Color constants
const PRIMARY = "#bf616a";
const SECONDARY = "#d08770";
const TERTIARY = "#a3be8c";
const QUATERNARY = "#88c0d0";
const QUINARY = "#5e81ac";
const SENARY = "#b48ead";
const DEBUG_GRAY = "#616e88";
const WARNING_YELLOW = "#ebcb8b";
const BACKGROUND1 = "#2e3440";
const BACKGROUND2 = "#3b4252";
const BACKGROUND3 = "#434c5e";
const TEXT = "#d8dee9";
const HEADERS = "#eceff4";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#434c5e";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette9 = {
    id: "palette-9",
    label: "Palette 9 — Nord",
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
        information: QUATERNARY,
        warning: WARNING_YELLOW,
        error: PRIMARY,
        critical: PRIMARY,
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
        warning: WARNING_YELLOW,
        info: QUATERNARY,
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

