/*
 * Palette 22 — Corporate Business
 * Crisp, professional light mode theme for business presentations
 * Clean blues, grays, and subtle accent colors
 */

// Color constants
const PRIMARY = "#0066CC";        // Corporate Blue
const SECONDARY = "#003366";      // Navy Blue
const TERTIARY = "#00A86B";       // Professional Green
const QUATERNARY = "#6B46C1";     // Professional Purple
const QUINARY = "#DC2626";        // Professional Red
const SENARY = "#F59E0B";         // Amber/Orange
const LOG_DEBUG = "#6B7280";      // Gray
const LOG_INFO = "#0066CC";       // Blue
const LOG_WARNING = "#F59E0B";    // Amber
const LOG_ERROR = "#DC2626";      // Red
const LOG_CRITICAL = "#B91C1C";   // Dark Red
const BACKGROUND1 = "#FFFFFF";    // White
const BACKGROUND2 = "#F8F9FA";    // Light Gray
const BACKGROUND3 = "#F1F3F5";   // Slightly Darker Gray
const TEXT = "#1F2937";           // Dark Gray/Black
const WHITE = "#FFFFFF";
const HIGHLIGHT = "rgba(0, 102, 204, 0.08)"; // Subtle blue highlight
const BORDER = "#E5E7EB";         // Light Gray Border

// Component colors
const COMPONENT_TEAL = "#14B8A6";     // Teal
const COMPONENT_ORANGE = "#F59E0B";   // Amber
const COMPONENT_GRAY = "#6B7280";     // Gray
const COMPONENT_GREEN = "#10B981";    // Green
const COMPONENT_BLUE = "#0066CC";      // Corporate Blue
const COMPONENT_PURPLE = "#6B46C1";   // Purple
const COMPONENT_DARK_GRAY = "#4B5563"; // Dark Gray

export const palette22 = {
    id: "palette-22",
    label: "Corporate Business",
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
        headers: SECONDARY,
        highlight: HIGHLIGHT,
        border: BORDER,
        success: TERTIARY,
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

