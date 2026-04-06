import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  hasError: boolean;
};

export default class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro ao carregar rota lazy.', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '40vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 520,
              p: 4,
              borderRadius: 4,
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack spacing={2} alignItems="flex-start">
              <Typography variant="h5" fontWeight={700}>
                Nao foi possivel carregar esta tela
              </Typography>
              <Typography color="text.secondary">
                Isso pode acontecer quando a aplicacao foi atualizada ou houve
                falha no carregamento do modulo. Tente recarregar a pagina.
              </Typography>
              <Button variant="contained" onClick={this.handleReload}>
                Recarregar pagina
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
