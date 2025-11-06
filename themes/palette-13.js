/*
 * Palette 13 — Tokyo Night
 * Modern dark theme with vibrant colors
 */

// Color constants
const PRIMARY = "#f7768e";
const SECONDARY = "#e0af68";
const TERTIARY = "#9ece6a";
const QUATERNARY = "#7dcfff";
const QUINARY = "#7aa2f7";
const SENARY = "#bb9af7";
const DEBUG_GRAY = "#565f89";
const CRITICAL_RED = "#db4b4b";
const BACKGROUND1 = "#1a1b26";
const BACKGROUND2 = "#24283b";
const BACKGROUND3 = "#16161e";
const TEXT = "#c0caf5";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#2f3549";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette13 = {
    id: "palette-13",
    label: "Palette 13 — Tokyo Night",
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
