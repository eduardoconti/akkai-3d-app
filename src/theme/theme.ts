import {
  alpha,
  createTheme,
  type PaletteMode,
  type Theme,
} from '@mui/material/styles';

export function getActiveMenuStyles(theme: Theme) {
  return {
    backgroundColor: alpha(
      theme.palette.primary.main,
      theme.palette.mode === 'dark' ? 0.18 : 0.1,
    ),
    color:
      theme.palette.mode === 'dark'
        ? theme.palette.primary.light
        : theme.palette.primary.dark,
    fontWeight: 700,
    '& .MuiListItemIcon-root': {
      color: 'inherit',
    },
    '& .MuiListItemText-primary': {
      fontWeight: 700,
    },
  };
}

export function getActiveSubmenuStyles(theme: Theme) {
  return {
    position: 'relative',
    color:
      theme.palette.mode === 'dark'
        ? theme.palette.primary.light
        : theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
    '& .MuiListItemText-primary': {
      fontWeight: 700,
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: 999,
      backgroundColor: theme.palette.primary.main,
    },
    '& .MuiListItemIcon-root': {
      color: 'inherit',
    },
  };
}

/**
 * Barra de rolagem fina que só se destaca quando o ponteiro está sobre a
 * área rolável (ex.: menu lateral).
 */
export function getDiscreetScrollbarStyles(theme: Theme) {
  const thumb = alpha(theme.palette.text.secondary, 0.4);

  return {
    scrollbarWidth: 'thin',
    scrollbarColor: 'transparent transparent',
    '&:hover': {
      scrollbarColor: `${thumb} transparent`,
    },
    '@supports not (scrollbar-color: auto)': {
      '&::-webkit-scrollbar': { width: 6 },
      '&::-webkit-scrollbar-track': { background: 'transparent' },
      '&::-webkit-scrollbar-thumb': {
        borderRadius: 999,
        backgroundColor: 'transparent',
      },
      '&:hover::-webkit-scrollbar-thumb': { backgroundColor: thumb },
    },
  } as const;
}

function fullScreenOnMobile(theme: Theme) {
  // `&&` eleva a especificidade acima de `fullWidth`/`maxWidth` do próprio MUI.
  return {
    '&&': {
      [theme.breakpoints.down('sm')]: {
        margin: 0,
        width: '100%',
        maxWidth: '100%',
        height: '100dvh',
        maxHeight: '100dvh',
        borderRadius: 0,
      },
    },
  };
}

export function buildTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  const text = {
    primary: isDark ? '#E6EDF5' : '#14202E',
    secondary: isDark ? '#9DB0C5' : '#5A6B7F',
  };
  const border = isDark ? '#243040' : '#E3E8EF';
  const surface = isDark ? '#151D27' : '#FFFFFF';
  const surfaceMuted = isDark ? '#1B2531' : '#F8FAFC';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#3AA6E0' : '#0974B0',
        light: '#5BB8EA',
        dark: '#075F94',
        // Texto escuro no modo escuro: branco sobre #3AA6E0 não atinge contraste AA.
        contrastText: isDark ? '#06121C' : '#FFFFFF',
      },
      secondary: {
        main: '#F5B800',
        light: '#FFD04D',
        dark: '#C99700',
        contrastText: '#3A2A00',
      },
      // Tons ajustados para contraste AA com texto branco (claro) ou como texto
      // sobre o fundo (`dark` de aviso é a variante própria para texto).
      error: {
        main: isDark ? '#F0686E' : '#C62F37',
        contrastText: isDark ? '#1A0507' : '#FFFFFF',
      },
      success: {
        main: isDark ? '#2DBE86' : '#0D7A52',
        contrastText: isDark ? '#04170F' : '#FFFFFF',
      },
      warning: {
        main: isDark ? '#F2A33A' : '#E08A00',
        dark: isDark ? '#F5B25C' : '#9A5B00',
        contrastText: isDark ? '#1F1200' : '#1F1200',
      },
      info: { main: isDark ? '#3AA6E0' : '#0B7FC0' },
      background: {
        default: isDark ? '#0E141B' : '#F6F8FB',
        paper: surface,
      },
      text,
      divider: border,
      action: {
        hover: isDark ? alpha('#FFFFFF', 0.05) : alpha('#14202E', 0.04),
        selected: isDark ? alpha('#3AA6E0', 0.16) : alpha('#0B7FC0', 0.1),
      },
    },
    shape: {
      borderRadius: 6,
    },
    typography: {
      fontFamily: 'Roboto, system-ui, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.015em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
      body1: { fontSize: '0.9375rem' },
      body2: { fontSize: '0.875rem' },
      caption: { fontSize: '0.78rem' },
      button: { fontWeight: 500, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            '& ::selection': {
              backgroundColor: alpha('#0B7FC0', 0.22),
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 12,
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? 'none'
              : '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.04)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: isDark
              ? '0 24px 64px rgba(0, 0, 0, 0.55)'
              : '0 24px 64px rgba(16, 24, 40, 0.18)',
          },
          // Formulários (sm/md/lg) ocupam a tela inteira no celular;
          // confirmações (xs) continuam como janela centralizada.
          paperWidthSm: ({ theme }) => fullScreenOnMobile(theme),
          paperWidthMd: ({ theme }) => fullScreenOnMobile(theme),
          paperWidthLg: ({ theme }) => fullScreenOnMobile(theme),
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 700 },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            overflowX: 'auto',
            boxShadow: 'none',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            borderCollapse: 'separate',
            borderSpacing: 0,
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: { backgroundColor: surfaceMuted },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&.MuiTableRow-hover:hover': {
              backgroundColor: isDark
                ? alpha('#3AA6E0', 0.08)
                : alpha('#0B7FC0', 0.04),
            },
            '&:focus-visible': {
              outline: `2px solid ${isDark ? '#3AA6E0' : '#0B7FC0'}`,
              outlineOffset: -2,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: '12px 16px' },
          head: {
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            color: text.secondary,
            borderBottomColor: border,
          },
          body: {
            borderBottomColor: border,
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: { color: text.secondary },
          toolbar: { color: text.secondary },
          selectIcon: { color: text.secondary },
          displayedRows: { color: text.secondary },
          selectLabel: { color: text.secondary },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: surface,
            backgroundImage: 'none',
            // O AppBar é um Paper: sem isso herdaria o canto arredondado dos cartões.
            borderRadius: 0,
            border: 0,
            borderBottom: `1px solid ${border}`,
            boxShadow: 'none',
            color: text.primary,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: surface,
            backgroundImage: 'none',
            borderRadius: 0,
            border: 0,
            borderRight: `1px solid ${border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'background-color 0.15s ease, color 0.15s ease',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
            // Alvo de toque confortável em telas sensíveis ao toque.
            '@media (pointer: coarse)': {
              minHeight: 44,
            },
          },
          containedPrimary: {
            boxShadow: 'none',
            '&:hover': { backgroundColor: isDark ? '#5BB8EA' : '#075F94' },
          },
          sizeSmall: {
            '@media (pointer: coarse)': {
              minHeight: 36,
            },
          },
          containedSecondary: {
            boxShadow: 'none',
          },
          outlined: {
            borderColor: isDark ? '#33435A' : '#CBD5E1',
            color: text.primary,
            '&:hover': {
              borderColor: isDark ? '#4A5E7A' : '#94A3B8',
              backgroundColor: isDark
                ? alpha('#FFFFFF', 0.05)
                : alpha('#14202E', 0.04),
            },
          },
          outlinedPrimary: {
            borderColor: alpha(isDark ? '#3AA6E0' : '#0B7FC0', 0.5),
            color: isDark ? '#5BB8EA' : '#0974B0',
            backgroundColor: 'transparent',
            '&:hover': {
              borderColor: isDark ? '#3AA6E0' : '#0B7FC0',
              backgroundColor: alpha(isDark ? '#3AA6E0' : '#0B7FC0', 0.08),
            },
          },
          textPrimary: {
            '&:hover': {
              backgroundColor: alpha(isDark ? '#3AA6E0' : '#0B7FC0', 0.08),
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '@media (pointer: coarse)': {
              minWidth: 40,
              minHeight: 40,
            },
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '16px 24px',
            gap: 8,
            justifyContent: 'flex-end',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: surface,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#33435A' : '#CBD5E1',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? '#4A5E7A' : '#94A3B8',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderColor: isDark ? '#33435A' : '#CBD5E1',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
          outlinedSecondary: {
            backgroundColor: alpha('#F5B800', 0.14),
            borderColor: alpha('#F5B800', 0.5),
          },
          outlinedPrimary: {
            color: isDark ? '#7CC4EE' : '#075F94',
            backgroundColor: alpha('#0B7FC0', 0.1),
            borderColor: alpha('#0B7FC0', 0.3),
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 500,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            boxShadow: isDark
              ? '0 12px 32px rgba(0, 0, 0, 0.5)'
              : '0 12px 32px rgba(16, 24, 40, 0.14)',
          },
        },
      },
    },
  });
}
