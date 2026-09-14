// src/constants/theme.ts
export const COLORS = {
  // Backgrounds
  bg: '#0D1117',
  bgSecondary: '#161B22',
  bgTertiary: '#1C2333',
  surface: 'rgba(255,255,255,0.06)',
  surfaceHover: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',

  // Brand
  primary: '#0A84FF',
  primaryLight: 'rgba(10,132,255,0.20)',
  primaryDark: '#0066CC',

  // Status
  success: '#30D158',
  successLight: 'rgba(48,209,88,0.18)',
  danger: '#FF453A',
  dangerLight: 'rgba(255,69,58,0.18)',
  warning: '#FF9F0A',
  warningLight: 'rgba(255,159,10,0.18)',
  info: '#64D2FF',
  infoLight: 'rgba(100,210,255,0.18)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textTertiary: 'rgba(255,255,255,0.40)',
  textDanger: '#FF6B6B',

  // Gradients (as array tuples)
  gradientBg: ['#0D1117', '#161B22'] as [string, string],
  gradientPrimary: ['#0A84FF', '#0066CC'] as [string, string],
  gradientDanger: ['#FF453A', '#CC2A1F'] as [string, string],
  gradientSuccess: ['#30D158', '#1A9E3A'] as [string, string],
  gradientWarning: ['#FF9F0A', '#E07A00'] as [string, string],
  gradientHeader: ['#0D1117', 'transparent'] as [string, string],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const FONT = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  danger: {
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  primary: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
};
