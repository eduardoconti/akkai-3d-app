import { Button, Stack, Typography } from '@mui/material';
import { HomeOutlined } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { usePageTitle } from '@/shared';

export default function NotFoundPage() {
  usePageTitle('Página não encontrada');

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{ minHeight: '55vh', textAlign: 'center', px: 2 }}
    >
      <Typography
        component="p"
        sx={{
          fontSize: { xs: '4.5rem', sm: '6rem' },
          fontWeight: 700,
          lineHeight: 1,
          color: 'primary.main',
          letterSpacing: '-0.04em',
        }}
      >
        404
      </Typography>
      <Typography variant="h5" component="h1">
        Página não encontrada
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        O endereço que você acessou não existe ou foi movido. Volte ao início
        para continuar.
      </Typography>
      <Button
        component={RouterLink}
        to="/"
        variant="contained"
        startIcon={<HomeOutlined />}
      >
        Ir para o início
      </Button>
    </Stack>
  );
}
