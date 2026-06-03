// ---- Warm Minimal Design System ----
// Premium, clean, sophisticated — warm but not rustic.

export const colors = {
  background: '#FAFAF8',
  card: '#FFFFFF',
  primary: '#B1744B',
  primaryLight: '#D4A88C',
  primaryBg: '#F5EEE8',
  text: '#1A1A1A',
  textSecondary: '#78716C',
  success: '#5B8C5A',
  successBg: '#F0F5F0',
  warning: '#C49B5C',
  warningBg: '#FDF8F0',
  border: '#E7E5E4',
  divider: '#F0EFED',
  white: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.06)',
};

export const fonts = {
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};
