import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { NewWalletDialog } from '@/features/finance';
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import { formatCurrency } from '@/shared';

export default function FinanceWalletsPage() {
  const { carteiras, fetchCarteiras, fetchErrorMessage, isFetching } =
    useFinanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void fetchCarteiras();
  }, [fetchCarteiras]);

  const wallets = useMemo(
    () => [...carteiras].sort((a, b) => a.nome.localeCompare(b.nome)),
    [carteiras],
  );

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Carteiras
          </Typography>
          <Typography color="text.secondary">
            Cadastre os destinos de entrada e saída para acompanhar o saldo por
            carteira.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Nova carteira
        </Button>
      </Stack>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <TableContainer component={Paper}>
        <Table aria-label="tabela de carteiras">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Nome</strong>
              </TableCell>
              <TableCell>
                <strong>Status</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Saldo Atual</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : wallets.length > 0 ? (
              wallets.map((carteira) => (
                <TableRow key={carteira.id}>
                  <TableCell>{carteira.nome}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={carteira.ativa ? 'Ativa' : 'Inativa'}
                      color={carteira.ativa ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      color:
                        carteira.saldoAtual < 0 ? 'error.main' : 'success.main',
                    }}
                  >
                    {formatCurrency(carteira.saldoAtual)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                  Nenhuma carteira cadastrada até o momento.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <NewWalletDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
}
