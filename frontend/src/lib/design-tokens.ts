/**
 * Dream LMS Design Tokens
 *
 * Centralized design system tokens for colors, spacing, and typography.
 * Use these constants to maintain consistency across the application.
 */

export const colors = {
  // Primary Brand Color (Teal)
  primary: {
    50: "#F0FDFA",
    100: "#CCFBF1",
    200: "#99F6E4",
    300: "#5EEAD4",
    400: "#2DD4BF",
    500: "#14B8A6", // Main primary color
    600: "#0D9488",
    700: "#0F766E",
    800: "#115E59",
    900: "#134E4A",
    950: "#042F2E",
  },

  // Secondary Brand Color (Cyan)
  secondary: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    200: "#A5F3FC",
    300: "#67E8F9",
    400: "#22D3EE",
    500: "#06B6D4", // Main secondary color
    600: "#0891B2",
    700: "#0E7490",
    800: "#155E75",
    900: "#164E63",
    950: "#083344",
  },
} as const

export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
  "3xl": "4rem", // 64px
} as const

export const typography = {
  fontFamily: {
    sans: ["Inter", "system-ui", "sans-serif"],
    mono: ["ui-monospace", "monospace"],
  },
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

export const shadows = {
  neuroSm: "2px 2px 4px rgba(0,0,0,0.2), -2px -2px 4px rgba(255,255,255,0.05)",
  neuro: "4px 4px 8px rgba(0,0,0,0.2), -4px -4px 8px rgba(255,255,255,0.05)",
  neuroLg:
    "8px 8px 16px rgba(0,0,0,0.2), -8px -8px 16px rgba(255,255,255,0.05)",
} as const

export const borderRadius = {
  sm: "0.25rem", // 4px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  full: "9999px", // Fully rounded
} as const
