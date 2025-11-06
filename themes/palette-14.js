/*
 * Palette 14 — Catppuccin Latte
 * Warm light theme from Catppuccin palette
 */

// Color constants
const PRIMARY = "#d20f39";
const SECONDARY = "#fe640b";
const TERTIARY = "#40a02b";
const QUATERNARY = "#179299";
const QUINARY = "#1e66f5";
const SENARY = "#8839ef";
const DEBUG_GRAY = "#6c6f85";
const WARNING_YELLOW = "#df8e1d";
const CRITICAL_RED = "#b42857";
const BACKGROUND1 = "#eff1f5";
const BACKGROUND2 = "#e6e9ef";
const BACKGROUND3 = "#dce0e8";
const TEXT = "#4c4f69";
const HEADERS = "#1e1e2e";
const HIGHLIGHT = "rgba(0, 0, 0, 0.05)";
const BORDER = "#bcc0cc";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette14 = {
    id: "palette-14",
    label: "Palette 14 — Catppuccin Latte",
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
        critical: CRITICAL_RED,
        event: TERTIARY,
        span: SENARY,
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
