import { StyleSheet, Platform } from 'react-native';

// ============================================================
// V8 Refined Design Tokens — 对标 375pt iPhone
// ============================================================

export const Colors = {
  bg: '#f5f5f3',
  bgGreenTop: '#CDE4B9',
  bgGreenMid: '#d5e8c4',
  card: '#ffffff',
  cardDashed: '#e0e0db',
  title: '#3a5030',
  subtitle: '#8a8a7e',
  body: '#5a5a4a',
  hint: '#b0b0a5',
  greenPrimary: '#6a9a52',
  greenDark: '#4a6141',
  greenLight: '#8cb87a',
  greenFaded: '#bfe1b1',
  greenBg: '#eaf4e4',
  red: '#e0554a',
  orange: '#e8953a',
  amber: '#d4a037',
  green: '#5ca85c',
  white: '#ffffff',
  divider: '#e8e8e0',
  tagBg: '#eef4ea',
  tagText: '#5a7a4a',
};

export const Shadows = StyleSheet.create({
  card: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    android: { elevation: 2 },
    default: {},
  }) as any,
  cardRaised: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
    android: { elevation: 4 },
    default: {},
  }) as any,
  fab: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
    android: { elevation: 6 },
    default: {},
  }) as any,
});

export const Fonts = {
  sizes: {
    caption: 11,
    xs: 12,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    hero: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 28,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 999,
};
