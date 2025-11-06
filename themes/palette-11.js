/*
 * Palette 11 — GitHub Light
 * GitHub's popular light theme
 */

// Color constants
const PRIMARY = "#d1242f";
const SECONDARY = "#bf8700";
const TERTIARY = "#1a7f37";
const QUATERNARY = "#0969da";
const QUINARY = "#8250df";
const SENARY = "#cf222e";
const DEBUG_GRAY = "#656d76";
const WARNING_ORANGE = "#9a6700";
const ERROR_RED = "#cf222e";
const CRITICAL_RED = "#a40e26";
const BACKGROUND1 = "#ffffff";
const BACKGROUND2 = "#f6f8fa";
const BACKGROUND3 = "#eaeef2";
const TEXT = "#24292f";
const HEADERS = "#1f2328";
const HIGHLIGHT = "rgba(0, 0, 0, 0.05)";
const BORDER = "#d0d7de";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette11 = {
    id: "palette-11",
    label: "Palette 11 — GitHub Light",
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
        warning: WARNING_ORANGE,
        error: ERROR_RED,
        critical: CRITICAL_RED,
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
        warning: WARNING_ORANGE,
        info: QUATERNARY,
        danger: ERROR_RED,
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
