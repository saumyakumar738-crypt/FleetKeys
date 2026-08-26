/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#11243e',
    tint: '#1665d8',

    // Core surfaces
    background: '#f5f8fc',
    foreground: '#11243e',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#11243e',

    // Primary action color (buttons, links, active states)
    primary: '#1665d8',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#eaf1fb',
    secondaryForeground: '#18345b',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#edf2f8',
    mutedForeground: '#6d7c91',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#dceaff',
    accentForeground: '#124ea6',

    // Destructive actions (delete, error states)
    destructive: '#d94b55',
    destructiveForeground: '#ffffff',
    success: '#1a9b71',
    warning: '#d48718',
    purple: '#7a5af8',

    // Borders and input outlines
    border: '#dbe4ef',
    input: '#ccd8e8',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
