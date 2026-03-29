import { alpha, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
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
      default: '#f4eaff',
      paper: '#fff9ff',
    },
    text: {
      primary: '#261743',
      secondary: '#5f4b82',
    },
    divider: alpha('#6f35c7', 0.16),
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
          border: `1px solid ${alpha('#6f35c7', 0.08)}`,
          boxShadow: '0 16px 44px rgba(72, 20, 132, 0.12)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage:
            'linear-gradient(90deg, rgba(255,249,255,0.94) 0%, rgba(245,235,255,0.94) 100%)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background:
            'linear-gradient(180deg, rgba(255,250,255,0.98) 0%, rgba(241,228,255,0.96) 100%)',
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
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #18a8e5 0%, #0d7cbc 100%)',
          boxShadow: '0 10px 24px rgba(18, 150, 212, 0.28)',
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #ffd451 0%, #ffbf0f 100%)',
        },
        outlinedPrimary: {
          borderColor: alpha('#1296d4', 0.42),
          backgroundColor: alpha('#ffffff', 0.72),
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

export default theme;
