import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
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
import { useTheme } from '@mui/material/styles';
import { EditWalletDialog, NewWalletDialog } from '@/features/finance';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
  formatCurrency,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function FinanceWalletsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { carteiras, fetchCarteiras, fetchErrorMessage, isFetching } =
    useFinanceStore(
      useShallow((state) => ({
        carteiras: financeStoreSelectors.carteiras(state),
        fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
        fetchErrorMessage: financeStoreSelectors.fetchErrorMessage(state),
        isFetching: financeStoreSelectors.isFetching(state),
      })),
    );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    void fetchCarteiras();
  }, [fetchCarteiras]);

  const wallets = useMemo(
    () => [...carteiras].sort((a, b) => a.nome.localeCompare(b.nome)),
    [carteiras],
  );
  const paginatedWallets = useMemo(
    () => wallets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, wallets],
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(wallets.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, rowsPerPage, wallets.length]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Carteiras"
        description="Cadastre os destinos de entrada e saída para acompanhar o saldo por carteira."
        actionLabel="Nova carteira"
        onAction={() => setDialogOpen(true)}
      />

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de carteiras">
            {isFetching ? (
              <LoadingState />
            ) : paginatedWallets.length > 0 ? (
              paginatedWallets.map((carteira) => (
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
              <EmptyState message="Nenhuma carteira cadastrada até o momento." />
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
                    <TableCell colSpan={3} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : paginatedWallets.length > 0 ? (
                  paginatedWallets.map((carteira) => (
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
                    <TableCell colSpan={3} sx={{ p: 0 }}>
                      <EmptyState message="Nenhuma carteira cadastrada até o momento." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={wallets.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_event, newPage) => {
            setPage(newPage);
          }}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
        />
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
