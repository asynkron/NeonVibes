/*
 * Palette 21 — SynthWave '84
 * Based on the popular VS Code theme by Robb Owen
 * Retro-futuristic neon aesthetic with magenta, cyan, and electric blue
 */

// Color constants
const PRIMARY = "#FF00FF";        // Magenta
const SECONDARY = "#00FFFF";      // Cyan/Aqua
const TERTIARY = "#FF69B4";       // Hot Pink
const QUATERNARY = "#0080FF";     // Electric Blue
const QUINARY = "#7B2CBF";        // Purple
const SENARY = "#FF006E";         // Deep Pink
const LOG_DEBUG = "#6B7280";      // Gray
const LOG_INFO = "#00FFFF";       // Cyan
const LOG_WARNING = "#FFB800";    // Amber
const LOG_ERROR = "#FF006E";      // Deep Pink/Red
const LOG_CRITICAL = "#FF006E";   // Deep Pink/Red
const BACKGROUND1 = "#262335";    // Deep Purple Background
const BACKGROUND2 = "#1E1B2E";    // Darker Purple
const BACKGROUND3 = "#0F0D1A";     // Darkest Purple
const TEXT = "#FFFFFF";           // White
const WHITE = "#FFFFFF";
const HIGHLIGHT = "rgba(255, 0, 255, 0.1)"; // Magenta glow
const BORDER = "#3A2F4A";        // Purple border

// Component colors
const COMPONENT_TEAL = "#00FFFF";     // Cyan
const COMPONENT_ORANGE = "#FFB800";   // Amber
const COMPONENT_GRAY = "#6B7280";     // Gray
const COMPONENT_GREEN = "#00FF88";    // Neon Green
const COMPONENT_BLUE = "#0080FF";      // Electric Blue
const COMPONENT_PURPLE = "#7B2CBF";   // Purple
const COMPONENT_DARK_GRAY = "#3A2F4A"; // Dark Purple Gray

export const palette21 = {
    id: "palette-21",
    label: "SynthWave '84",
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
        information: LOG_INFO,
        warning: LOG_WARNING,
        error: LOG_ERROR,
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
        success: COMPONENT_GREEN,
        warning: LOG_WARNING,
        info: LOG_INFO,
        danger: LOG_ERROR,
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

