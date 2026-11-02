import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Login as LoginIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import { BrandLogo, BrandMark, usePageTitle } from '@/shared';

type LocationState = {
  from?: {
    pathname: string;
  };
};

export default function LoginPage() {
  usePageTitle('Entrar');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? '/vendas';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || isLoading) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        login: loginValue,
        password,
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getProblemDetailsFromError(error).detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '5fr 6fr' },
        overflowX: 'hidden',
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: '#FFFFFF',
          background:
            'linear-gradient(160deg, #075F94 0%, #0B7FC0 55%, #1496D6 100%)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <BrandMark size={44} />
          <Typography
            component="span"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            AKKAI 3D
          </Typography>
        </Stack>

        <Box sx={{ maxWidth: 440 }}>
          <Typography variant="h3" component="p" sx={{ fontWeight: 700 }}>
            Vendas, estoque e finanças em um só lugar.
          </Typography>
          <Typography sx={{ mt: 2, opacity: 0.85 }}>
            Registre vendas rápidas na feira, acompanhe o caixa e saiba o que
            produzir em seguida.
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Operação AKKAI 3D
        </Typography>
      </Box>

      <Box
        component="main"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 4,
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400, minWidth: 0 }}>
          <Stack
            component="form"
            spacing={3}
            noValidate
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              void handleSubmit(event);
            }}
          >
            <Box>
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
                <BrandLogo size={40} />
              </Box>
              <Typography variant="h4" component="h1">
                Entrar
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Use seu login e senha para acessar a operação.
              </Typography>
            </Box>

            {errorMessage ? (
              <Alert severity="error" role="alert">
                {errorMessage}
              </Alert>
            ) : null}

            <TextField
              fullWidth
              label="Login"
              value={loginValue}
              onChange={(event) => setLoginValue(event.target.value)}
              name="username"
              autoComplete="username"
              slotProps={{
                htmlInput: {
                  inputMode: 'text',
                  autoCapitalize: 'none',
                  autoCorrect: 'off',
                  spellCheck: false,
                },
              }}
              helperText="Apenas letras, com no minimo 3 caracteres."
            />

            <TextField
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              name="password"
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((current) => !current)}
                        onMouseDown={(event) => event.preventDefault()}
                        aria-label={
                          showPassword ? 'Ocultar senha' : 'Exibir senha'
                        }
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={
                isSubmitting || isLoading ? (
                  <CircularProgress size={18} aria-label="Entrando" />
                ) : (
                  <LoginIcon />
                )
              }
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
