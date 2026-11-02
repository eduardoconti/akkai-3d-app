import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
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

type LocationState = {
  from?: {
    pathname: string;
  };
};

export default function LoginPage() {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 2,
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 440,
          minWidth: 0,
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
        }}
      >
        <Stack
          component="form"
          spacing={3}
          noValidate
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            void handleSubmit(event);
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={900}
              color="primary.main"
            >
              AKKAI 3D
            </Typography>
            <Typography
              variant="h6"
              component="h2"
              fontWeight={700}
              sx={{ mt: 1 }}
            >
              Entrar no ERP
            </Typography>
            <Typography color="text.secondary">
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
                <CircularProgress size={18} />
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
      </Paper>
    </Box>
  );
}
