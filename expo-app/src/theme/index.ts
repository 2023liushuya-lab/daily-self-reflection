export const colors = {
  background: '#FFF8F0',
  card: '#FFFBF7',
  primary: '#C4724B',
  primaryLight: '#D4895E',
  text: '#3C2E26',
  textSecondary: '#8B7355',
  success: '#6B9F6E',
  warning: '#D4956B',
  border: '#E8D5C4',
  white: '#FFFFFF',
};

export const fonts = {
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: 14,
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
};
