import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { EditWalletDialog, NewWalletDialog } from '@/features/finance';
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import { formatCurrency } from '@/shared';

export default function FinanceWalletsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { carteiras, fetchCarteiras, fetchErrorMessage, isFetching } =
    useFinanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<number | null>(null);

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

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de carteiras">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : wallets.length > 0 ? (
              wallets.map((carteira) => (
                <Box
                  key={carteira.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingWalletId(carteira.id)}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1.5}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {carteira.nome}
                      </Typography>
                      <Chip
                        size="small"
                        label={carteira.ativa ? 'Ativa' : 'Inativa'}
                        color={carteira.ativa ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">
                        Saldo atual
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        color={
                          carteira.saldoAtual < 0 ? 'error.main' : 'success.main'
                        }
                      >
                        {formatCurrency(carteira.saldoAtual)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma carteira cadastrada até o momento.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
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
                    <TableRow
                      key={carteira.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingWalletId(carteira.id)}
                    >
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
        )}
      </Paper>

      <NewWalletDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <EditWalletDialog
        open={editingWalletId !== null}
        walletId={editingWalletId}
        onClose={() => setEditingWalletId(null)}
        onUpdated={fetchCarteiras}
      />
    </Stack>
  );
}
