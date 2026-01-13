import { createTheme, DEFAULT_THEME } from '@mantine/core';

const theme = createTheme({
  ...DEFAULT_THEME,
  
  // Palette de couleurs inspirée du logo kawaii
  colors: {
    // Bleu principal (planète)
    blue: [
      '#e3f4fd',
      '#cbe8fb', 
      '#93d5f7',
      '#57c1f3',
      '#2bb1f0',
      '#0aa7ee',
      '#00a3ef', // Couleur principale du logo
      '#008fd5',
      '#007fbf',
      '#006ea8'
    ],
    
    // Vert (continents)
    green: [
      '#e8faf0',
      '#d3f4e0',
      '#a8e8c1',
      '#7adb9f',
      '#55cf82',
      '#3dc970',
      '#2fc665', // Couleur des continents
      '#23b058',
      '#1a9d4e',
      '#0f8943'
    ],
    
    // Orange/Coral (bulle A)
    orange: [
      '#ffe8dc',
      '#ffd1c1',
      '#ffa094',
      '#ff6b63',
      '#ff4639',
      '#ff3420',
      '#ff6b47', // Couleur de la bulle A
      '#e55934',
      '#cc4d2c',
      '#b23f24'
    ],
    
    // Rose (bulle C)
    pink: [
      '#ffe0e8',
      '#ffc2d3',
      '#ff85a8',
      '#ff477a',
      '#ff1754',
      '#f0003c',
      '#ff7ba7', // Couleur de la bulle C
      '#d9004f',
      '#c2005b',
      '#aa0066'
    ],
    
    // Jaune (bulle Я)
    yellow: [
      '#fff4e0',
      '#ffe8cc',
      '#ffce99',
      '#ffb366',
      '#ff9c3d',
      '#ff8c1f',
      '#ffd93d', // Couleur de la bulle Я
      '#e5c134',
      '#ccaa2d',
      '#b39426'
    ]
  },

  primaryColor: 'blue',
  primaryShade: 6,

  // Couleurs par défaut pour différents états
  // defaultColors: {
  //   dark: [
  //     '#C9C9C9',
  //     '#b8b8b8', 
  //     '#828282',
  //     '#696969',
  //     '#424242',
  //     '#3b3b3b',
  //     '#2e2e2e', // Couleur sombre principale
  //     '#242424',
  //     '#1f1f1f',
  //     '#141414'
  //   ],
  // },

  // Bordures arrondies pour un style kawaii
  defaultRadius: 'md',
  
  // Espacements généreux
  spacing: {
    xs: '0.625rem',
    sm: '0.875rem', 
    md: '1.25rem',
    lg: '1.875rem',
    xl: '3rem',
  },

  // Ombres douces pour un effet kawaii
  shadows: {
    xs: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05)',
    sm: '0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.05), 0 0.0625rem 0.375rem rgba(0, 0, 0, 0.08)',
    md: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.08), 0 0.125rem 0.375rem rgba(0, 0, 0, 0.08)',
    lg: '0 0.625rem 1.875rem rgba(0, 0, 0, 0.08), 0 0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
    xl: '0 1.25rem 3.125rem rgba(0, 0, 0, 0.08), 0 0.625rem 1.25rem rgba(0, 0, 0, 0.08)',
  },

  // Polices cohérentes avec le design moderne
  fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'var(--font-geist-mono), Monaco, Courier, monospace',

  // Tailles de polices harmonieuses
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem', 
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },

  // Hauteurs de ligne optimisées
  lineHeights: {
    xs: '1.4',
    sm: '1.45',
    md: '1.55',
    lg: '1.6',
    xl: '1.65',
  },

  // Style des composants
  components: {
    Button: {
      styles: {
        root: {
          fontWeight: 600,
          // borderRadius: '10px',
        },
      },
    },
    
    Card: {
      styles: {
        root: {
          borderRadius: '16px',
          border: '1px solid #f1f3f5',
        },
      },
    },

    Modal: {
      styles: {
        content: {
          borderRadius: '20px',
        },
      },
    },

    Paper: {
      styles: {
        root: {
          borderRadius: '16px',
        },
      },
    },
  },
});

export default theme;