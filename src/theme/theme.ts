import {
  alpha,
  createTheme,
  type PaletteMode,
  type Theme,
} from '@mui/material/styles';

export function getActiveMenuStyles(theme: Theme) {
  return {
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(theme.palette.primary.dark, 0.95)} 100%)`,
    color: theme.palette.primary.contrastText,
    boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.24)}`,
    '& .MuiListItemIcon-root': {
      color: theme.palette.secondary.main,
    },
  };
}

export function getActiveSubmenuStyles(theme: Theme) {
  return {
    position: 'relative',
    color: theme.palette.primary.main,
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
      color: theme.palette.primary.main,
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

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1296d4',
        light: '#46b9ef',
        dark: '#0b6ea3',
        contrastText: '#fffdf4',
      },
      secondary: {
        main: '#ffbf0f',
        light: '#ffd451',
        dark: '#db9800',
        contrastText: '#402600',
      },
      error: {
        main: '#ef3f93',
      },
      success: {
        main: '#1ca67a',
      },
      warning: {
        main: '#ff9f1c',
      },
      background: {
        default: isDark ? '#171224' : '#f4eaff',
        paper: isDark ? '#201833' : '#fff9ff',
      },
      text: {
        primary: isDark ? '#f5edff' : '#261743',
        secondary: isDark ? '#c8b7eb' : '#5f4b82',
      },
      divider: alpha(isDark ? '#b487ff' : '#6f35c7', isDark ? 0.22 : 0.16),
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily: 'Roboto, sans-serif',
      h5: {
        fontWeight: 800,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 800,
        letterSpacing: '-0.01em',
      },
      button: {
        fontWeight: 700,
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${alpha(isDark ? '#b487ff' : '#6f35c7', isDark ? 0.14 : 0.08)}`,
            boxShadow: isDark
              ? '0 4px 16px rgba(6, 2, 18, 0.32)'
              : '0 2px 12px rgba(72, 20, 132, 0.08)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          // Formulários (sm/md/lg) ocupam a tela inteira no celular;
          // confirmações (xs) continuam como janela centralizada.
          paperWidthSm: ({ theme }) => fullScreenOnMobile(theme),
          paperWidthMd: ({ theme }) => fullScreenOnMobile(theme),
          paperWidthLg: ({ theme }) => fullScreenOnMobile(theme),
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
          root: {
            backgroundColor: isDark
              ? alpha('#f5edff', 0.08)
              : alpha('#261743', 0.04),
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            color: isDark ? '#f5edff' : '#261743',
            borderBottomColor: alpha(
              isDark ? '#b487ff' : '#6f35c7',
              isDark ? 0.18 : 0.12,
            ),
          },
          body: {
            borderBottomColor: alpha(
              isDark ? '#b487ff' : '#6f35c7',
              isDark ? 0.12 : 0.1,
            ),
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            color: isDark ? '#f5edff' : '#261743',
          },
          toolbar: {
            color: isDark ? '#f5edff' : '#261743',
          },
          selectIcon: {
            color: isDark ? '#f5edff' : '#261743',
          },
          displayedRows: {
            color: isDark ? '#f5edff' : '#261743',
          },
          selectLabel: {
            color: isDark ? '#f5edff' : '#261743',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? 'linear-gradient(90deg, rgba(28,22,43,0.94) 0%, rgba(37,27,59,0.94) 100%)'
              : 'linear-gradient(90deg, rgba(255,249,255,0.94) 0%, rgba(245,235,255,0.94) 100%)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: isDark
              ? 'linear-gradient(180deg, rgba(25,20,39,0.98) 0%, rgba(34,26,53,0.96) 100%)'
              : 'linear-gradient(180deg, rgba(255,250,255,0.98) 0%, rgba(241,228,255,0.96) 100%)',
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
            fontWeight: 700,
            borderRadius: 14,
            // Alvo de toque confortável em telas sensíveis ao toque.
            '@media (pointer: coarse)': {
              minHeight: 44,
            },
          },
          containedPrimary: {
            background: 'linear-gradient(135deg, #18a8e5 0%, #0d7cbc 100%)',
            boxShadow: '0 2px 8px rgba(18, 150, 212, 0.24)',
          },
          sizeSmall: {
            '@media (pointer: coarse)': {
              minHeight: 36,
            },
          },
          containedSecondary: {
            background: 'linear-gradient(135deg, #ffd451 0%, #ffbf0f 100%)',
          },
          outlinedPrimary: {
            borderColor: alpha('#1296d4', 0.42),
            backgroundColor: alpha(
              isDark ? '#171224' : '#ffffff',
              isDark ? 0.72 : 0.72,
            ),
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
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
            backgroundColor: isDark
              ? alpha('#ffffff', 0.02)
              : alpha('#ffffff', 0.66),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          outlinedSecondary: {
            backgroundColor: alpha('#ffbf0f', 0.14),
            borderColor: alpha('#ffbf0f', 0.4),
          },
          outlinedPrimary: {
            backgroundColor: alpha('#1296d4', 0.12),
            borderColor: alpha('#1296d4', 0.32),
          },
        },
      },
    },
  });
}
