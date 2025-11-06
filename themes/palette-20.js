/*
 * Palette 20 — Horizon Dark
 * Modern dark theme with vibrant accent colors
 */

// Color constants
const PRIMARY = "#e95678";
const SECONDARY = "#fab795";
const TERTIARY = "#29d398";
const QUATERNARY = "#26bbd9";
const QUINARY = "#3fc4de";
const SENARY = "#ee64ac";
const DEBUG_GRAY = "#6c6f93";
const CRITICAL_RED = "#da103f";
const BACKGROUND1 = "#1c1e26";
const BACKGROUND2 = "#232530";
const BACKGROUND3 = "#16161c";
const TEXT = "#d5d8da";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#2e303e";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette20 = {
    id: "palette-20",
    label: "Palette 20 — Horizon Dark",
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
