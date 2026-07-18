/**
 * Theme Configuration for ScanWise
 * 
 * Centralized design system with:
 * - Color palette (primary, secondary, semantic)
 * - Spacing scale (4px base unit)
 * - Typography sizes
 * - Shadows & elevations
 * - Border radius scale
 */

export const colors = {
  // Primary Brand Colors
  primary: '#10B981',        // Emerald green (main action)
  primaryDark: '#059669',    // Darker emerald (pressed state)
  primaryLight: '#D1FAE5',   // Light emerald (background)

  // Semantic Colors
  success: '#10B981',        // Green (good/safe)
  warning: '#F59E0B',        // Amber (caution)
  danger: '#EF4444',         // Red (alert/unsafe)
  info: '#3B82F6',           // Blue (information)

  // Grayscale (Neutral)
  background: '#FFFFFF',     // Main app background
  surface: '#F9FAFB',        // Cards, elevated surfaces
  border: '#E5E7EB',         // Dividers, borders
  text: '#1F2937',           // Primary text
  textSecondary: '#6B7280',  // Secondary text
  textTertiary: '#9CA3AF',   // Tertiary text (disabled)
  disabled: '#D1D5DB',       // Disabled elements

  // Dark Mode Support (future)
  darkBackground: '#111827',
  darkSurface: '#1F2937',
  darkText: '#F9FAFB',
  darkBorder: '#374151',
};

export const spacing = {
  // 4px base unit scale
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Common pairs
  paddingSmall: 8,
  paddingMedium: 16,
  paddingLarge: 24,
  marginSmall: 8,
  marginMedium: 16,
  marginLarge: 24,
};

export const typography = {
  sizes: {
    xs: 12,       // Tiny labels
    sm: 14,       // Body text
    base: 16,     // Default
    lg: 18,       // Subheading
    xl: 20,       // Heading 3
    xxl: 24,      // Heading 2
    xxxl: 32,     // Heading 1
  },

  weights: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

export const shadows = {
  // Elevation levels
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

export const opacity = {
  disabled: 0.5,
  hover: 0.8,
  focus: 0.9,
  pressed: 0.7,
};

/**
 * Complete Theme Object
 * Export as single object for easy destructuring
 */
export const theme = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  opacity,

  // Common combinations for reuse
  button: {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      ...shadows.md,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    danger: {
      backgroundColor: colors.danger,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.base,
    backgroundColor: colors.background,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },

  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    fontSize: typography.sizes.xs,
  },
};

export default theme;