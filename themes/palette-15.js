/*
 * Palette 15 — Material Theme
 * Popular Material Design-inspired dark theme
 */

// Color constants
const PRIMARY = "#f07178";
const SECONDARY = "#ffcb6b";
const TERTIARY = "#c3e88d";
const QUATERNARY = "#89ddff";
const QUINARY = "#82aaff";
const SENARY = "#c792ea";
const LOG_DEBUG = "#546e7a";
const LOG_CRITICAL = "#ff5370";
const BACKGROUND1 = "#263238";
const BACKGROUND2 = "#2e3c43";
const BACKGROUND3 = "#1e272c";
const TEXT = "#eeffff";
const WHITE = "#ffffff";
const HIGHLIGHT = "rgba(255, 255, 255, 0.05)";
const BORDER = "#37474f";

// Component colors
const COMPONENT_TEAL = "#1abc9c";
const COMPONENT_ORANGE = "#f39c12";
const COMPONENT_GRAY = "#95a5a6";
const COMPONENT_GREEN = "#98c379";
const COMPONENT_BLUE = "#3498db";
const COMPONENT_PURPLE = "#c678dd";
const COMPONENT_DARK_GRAY = "#34495e";

export const palette15 = {
    id: "palette-15",
    label: "Palette 15 — Material Theme",
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
        warning: SECONDARY,
        error: PRIMARY,
        critical: LOG_CRITICAL,
        event: TERTIARY,
        span: QUATERNARY,
    },
    ui: {
        surface: BACKGROUND1,
        text: TEXT,
        headers: WHITE,
        highlight: HIGHLIGHT,
        border: BORDER,
        success: TERTIARY,
        warning: SECONDARY,
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
