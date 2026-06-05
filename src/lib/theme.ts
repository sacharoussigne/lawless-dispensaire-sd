import { createTheme, DEFAULT_THEME, type CSSVariablesResolver } from '@mantine/core';
import {
  clayPalette,
  dangerPalette,
  denimPalette,
  dispTokens,
  leatherPalette,
  mossPalette,
  sagePalette,
  slatePalette,
  winePalette,
} from '@/lib/design-tokens';

const { colors: c, radius: r, shadows: s } = dispTokens;

const selectLikeInput = {
  backgroundColor: c.surface,
  borderColor: c.surfaceBorder,
  color: c.ink,
  lineHeight: 1.25,
};

const selectLikeSection = {
  display: 'flex',
  alignItems: 'center',
  lineHeight: 0,
};

const comboboxDropdown = {
  backgroundColor: c.surface,
  borderColor: c.surfaceBorder,
};

const comboboxOption = {
  display: 'flex',
  alignItems: 'center',
  lineHeight: 1.25,
  color: c.ink,
  '& span': {
    lineHeight: 1.25,
    position: 'relative',
    top: 1,
  },
  '&:hover:not([data-combobox-selected]):not([data-combobox-disabled])': {
    backgroundColor: 'var(--mantine-color-sage-0)',
  },
  '&[data-combobox-selected]': {
    backgroundColor: 'var(--mantine-color-sage-0)',
    color: c.sage,
  },
  '&[data-combobox-active]': {
    backgroundColor: 'var(--mantine-color-sage-0)',
  },
};

const theme = createTheme({
  ...DEFAULT_THEME,

  /** Used for dropdowns, popovers, etc. — not pure #fff */
  white: c.surface,
  black: c.ink,

  colors: {
    sage: [...sagePalette],
    leather: [...leatherPalette],
    danger: [...dangerPalette],
    slate: [...slatePalette],
    wine: [...winePalette],
    clay: [...clayPalette],
    moss: [...mossPalette],
    denim: [...denimPalette],
    blue: [
      '#e3f4fd',
      '#cbe8fb',
      '#93d5f7',
      '#57c1f3',
      '#2bb1f0',
      '#0aa7ee',
      '#00a3ef',
      '#008fd5',
      '#007fbf',
      '#006ea8',
    ],
  },

  primaryColor: 'sage',
  primaryShade: 6,

  defaultRadius: 'md',

  fontFamily: dispTokens.fonts.ui,
  fontFamilyMonospace: dispTokens.fonts.mono,
  headings: {
    fontFamily: dispTokens.fonts.display,
    fontWeight: '400',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.25' },
      h2: { fontSize: '1.5rem', lineHeight: '1.3' },
      h3: { fontSize: '1.25rem', lineHeight: '1.35' },
    },
  },

  spacing: {
    xs: '0.625rem',
    sm: '0.875rem',
    md: '1.25rem',
    lg: '1.875rem',
    xl: '3rem',
  },

  shadows: {
    xs: '0 1px 2px rgba(61, 52, 41, 0.04)',
    sm: s.card,
    md: s.elevated,
    lg: '0 8px 24px rgba(61, 52, 41, 0.1)',
    xl: '0 12px 32px rgba(61, 52, 41, 0.12)',
  },

  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },

  lineHeights: {
    xs: '1.4',
    sm: '1.45',
    md: '1.55',
    lg: '1.6',
    xl: '1.65',
  },

  other: {
    dispSurface: c.surface,
    dispSurfaceBorder: c.surfaceBorder,
    dispInk: c.ink,
    dispBackground: c.background,
  },

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        inner: {
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1.25,
        },
        label: {
          lineHeight: 1.25,
          position: 'relative',
          top: 1,
        },
        section: {
          display: 'flex',
          alignItems: 'center',
          lineHeight: 0,
        },
      },
    },

    Badge: {
      defaultProps: {
        variant: 'outline',
        radius: 'sm',
      },
      styles: {
        root: {
          fontWeight: 600,
          fontSize: 'var(--mantine-font-size-xs)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: {
          lineHeight: 1.25,
          position: 'relative',
          top: 1,
        },
        section: {
          display: 'flex',
          alignItems: 'center',
          lineHeight: 0,
        },
      },
    },

    Card: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: c.surface,
          borderColor: c.surfaceBorder,
          borderRadius: r.lg,
          boxShadow: s.card,
        },
      },
    },

    Paper: {
      styles: {
        root: {
          backgroundColor: c.surface,
          borderColor: c.surfaceBorder,
          borderRadius: r.lg,
        },
      },
    },

    Modal: {
      styles: {
        header: {
          backgroundColor: c.surface,
          borderBottom: `1px solid ${c.surfaceBorder}`,
        },
        title: {
          fontFamily: dispTokens.fonts.display,
          fontWeight: 400,
          color: c.ink,
        },
        content: {
          borderRadius: r.modal,
          backgroundColor: c.surface,
        },
        body: {
          backgroundColor: c.surface,
        },
      },
    },

    Menu: {
      styles: {
        dropdown: {
          backgroundColor: c.surface,
          borderColor: c.surfaceBorder,
        },
        item: {
          color: c.ink,
          '&[data-hovered]': {
            backgroundColor: 'var(--mantine-color-sage-0)',
            color: c.sage,
          },
        },
        label: {
          color: c.inkMuted,
        },
      },
    },

    SegmentedControl: {
      styles: {
        root: {
          backgroundColor: c.background,
        },
      },
    },

    Drawer: {
      styles: {
        content: {
          backgroundColor: c.surface,
        },
        header: {
          backgroundColor: c.surface,
          borderBottom: `1px solid ${c.surfaceBorder}`,
        },
      },
    },

    TextInput: {
      styles: {
        input: {
          backgroundColor: c.surface,
          borderColor: c.surfaceBorder,
          color: c.ink,
        },
      },
    },

    Select: {
      defaultProps: {
        withAlignedLabels: true,
      },
      styles: {
        input: selectLikeInput,
        section: selectLikeSection,
        dropdown: comboboxDropdown,
        option: comboboxOption,
      },
    },

    Combobox: {
      styles: {
        dropdown: comboboxDropdown,
        option: comboboxOption,
      },
    },

    Popover: {
      styles: {
        dropdown: {
          backgroundColor: c.surface,
          borderColor: c.surfaceBorder,
        },
      },
    },

    Autocomplete: {
      styles: {
        input: selectLikeInput,
        section: selectLikeSection,
        dropdown: comboboxDropdown,
        option: comboboxOption,
      },
    },

    MultiSelect: {
      defaultProps: {
        withAlignedLabels: true,
      },
      styles: {
        input: selectLikeInput,
        inputField: {
          lineHeight: 1.25,
        },
        section: selectLikeSection,
        dropdown: comboboxDropdown,
        option: comboboxOption,
      },
    },

    Textarea: {
      styles: {
        input: {
          backgroundColor: c.surface,
          borderColor: c.surfaceBorder,
          color: c.ink,
        },
      },
    },

    NumberInput: {
      styles: {
        input: {
          backgroundColor: c.surface,
          borderColor: c.surfaceBorder,
          color: c.ink,
        },
      },
    },

    Accordion: {
      styles: {
        control: {
          backgroundColor: c.tableHeader,
          color: c.ink,
          '&:hover': {
            backgroundColor: 'var(--mantine-color-sage-0)',
          },
        },
        item: {
          borderColor: c.surfaceBorder,
          backgroundColor: c.tableHeader,
        },
        panel: {
          backgroundColor: c.surface,
        },
        chevron: {
          color: c.inkMuted,
        },
      },
    },

    Divider: {
      styles: {
        label: {
          color: c.inkMuted,
          fontWeight: 600,
        },
      },
    },

    Tabs: {
      styles: {
        list: {
          borderColor: c.surfaceBorder,
        },
        tab: {
          color: c.inkMuted,
          '&[data-active]': {
            color: c.sage,
            borderColor: c.sage,
          },
          '&:hover': {
            backgroundColor: 'var(--mantine-color-sage-0)',
            color: c.sage,
          },
        },
      },
    },

    Table: {
      vars: () => ({
        table: {
          '--table-striped-color': c.tableZebra,
          '--table-highlight-on-hover-color': 'var(--mantine-color-sage-0)',
          '--table-border-color': c.surfaceBorder,
        },
      }),
      styles: {
        table: {
          backgroundColor: c.surface,
        },
        thead: {
          backgroundColor: c.tableHeader,
        },
        th: {
          color: c.ink,
          fontWeight: 600,
          backgroundColor: c.tableHeader,
        },
        td: {
          color: c.ink,
        },
      },
    },
  },
});

/** Readable muted text and surfaces on cream backgrounds (light scheme). */
export const dispCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-dimmed': c.inkMuted,
    '--mantine-color-body': c.background,
    '--mantine-color-text': c.ink,
    '--mantine-color-default-hover': c.tableHeader,
    '--mantine-color-default-border': c.surfaceBorder,
    '--mantine-font-family': dispTokens.fonts.ui,
    '--mantine-font-family-monospace': dispTokens.fonts.mono,
  },
  dark: {
    '--mantine-color-dimmed': 'var(--mantine-color-dark-2)',
    '--mantine-font-family': dispTokens.fonts.ui,
    '--mantine-font-family-monospace': dispTokens.fonts.mono,
  },
});

export default theme;
