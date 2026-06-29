// COSY v4.9 — Design Tokens
const COSY_THEME = {
  colors: {
    // Primary
    msBlue: '#0078D4',
    msBlueLight: '#2899F5',
    msBlueGlow: 'rgba(0,120,212,0.35)',

    // Secondary
    savane: '#3DA876',
    savaneLight: '#5CCF94',
    savaneGlow: 'rgba(61,168,118,0.3)',

    // Accent
    orange: '#FF6520',
    orangeLight: '#FF8A52',
    orangeGlow: 'rgba(255,101,32,0.35)',

    // B2B
    gold: '#D4A847',
    goldLight: '#E8C86A',
    goldGlow: 'rgba(212,168,71,0.35)',

    // Status
    live: '#E8404A',
    gains: '#2EC97A',

    // Backgrounds
    night0: '#060E1C',
    night1: '#0B1628',
    night2: '#0F1E38',
    night3: '#152342',
    night4: '#1C2E52',
    night5: '#243660',

    // Light mode
    light0: '#F8F6F3',
    light1: '#EDE9E3',
    light2: '#DDD6CC',
    light3: '#B8A99A',
    light4: '#8C7B6B'
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },

  radius: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    pill: '100px'
  },

  shadows: {
    sm: '0 2px 8px rgba(0,0,0,0.25)',
    md: '0 8px 28px rgba(0,0,0,0.4)',
    lg: '0 16px 48px rgba(0,0,0,0.5)',
    glow: '0 0 40px rgba(0,120,212,0.35)'
  },

  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px'
  }
};

if (typeof module !== 'undefined') module.exports = COSY_THEME;
