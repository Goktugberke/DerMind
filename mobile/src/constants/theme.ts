export const theme = {
  colors: {
    // Main colors
    primary: '#FFC1C1',
    secondary: '#8A226F',

    // Neutral colors
    background: '#F8F8F8',
    deepbackground: '#f4f4f4',
    white: '#FFFFFF',
    text: '#2D3436',
    gray: '#636E72',
    lightGray: '#DFE6E9',

    // Status colors
    error: '#D63031',
    warning: '#557ae1ff',
    success: '#09b800ff',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
  },
  fontSize: {
    small: 12,
    medium: 16,
    large: 20,
    title: 28,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    round: 25,
  }
};

export type Theme = typeof theme;