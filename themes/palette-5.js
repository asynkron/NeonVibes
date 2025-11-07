/*
 * Palette 5 — Monokai
 * Classic code editor theme inspired by Monokai (Sublime Text)
 */

// Color constants
const PRIMARY = "#f92672";
const SECONDARY = "#e6db74";
const TERTIARY = "#a6e22e";
const QUATERNARY = "#66d9ef";
const QUINARY = "#fd971f";
const SENARY = "#ae81ff";
const LOG_DEBUG = "#75715e";
const LOG_CRITICAL = "#cc6666";
const BACKGROUND1 = "#272822";
const BACKGROUND2 = "#2c2d27";
const BACKGROUND3 = "#1e1f1a";
const TEXT = "#f8f8f2";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#3e3e3e";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#00000080";

export const palette5 = {
    id: "palette-5",
    label: "Palette 5 — Monokai",
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
        information: QUATERNARY,
        warning: SECONDARY,
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

