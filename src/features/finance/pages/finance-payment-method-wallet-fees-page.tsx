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
  TablePagination,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useShallow } from 'zustand/react/shallow';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import { MEIO_PAGAMENTO_LABEL } from '@/features/finance/types/finance-form';
import PaymentMethodWalletFeeDialog from '../components/payment-method-wallet-fee-dialog';

export default function FinancePaymentMethodWalletFeesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    fetchCarteiras,
    fetchErrorMessage,
    fetchTaxasMeioPagamentoCarteira,
    isFetching,
    taxasMeioPagamentoCarteira,
  } = useFinanceStore(
    useShallow((state) => ({
      fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
      fetchErrorMessage: financeStoreSelectors.fetchErrorMessage(state),
      fetchTaxasMeioPagamentoCarteira:
        financeStoreSelectors.fetchTaxasMeioPagamentoCarteira(state),
      isFetching: financeStoreSelectors.isFetching(state),
      taxasMeioPagamentoCarteira:
        financeStoreSelectors.taxasMeioPagamentoCarteira(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    void Promise.all([fetchCarteiras(), fetchTaxasMeioPagamentoCarteira()]);
  }, [fetchCarteiras, fetchTaxasMeioPagamentoCarteira]);

  const fees = useMemo(
    () =>
      [...taxasMeioPagamentoCarteira].sort((a, b) => {
        const byWallet = (a.carteira?.nome ?? '').localeCompare(
          b.carteira?.nome ?? '',
        );

        if (byWallet !== 0) {
          return byWallet;
        }

        return a.meioPagamento.localeCompare(b.meioPagamento);
      }),
    [taxasMeioPagamentoCarteira],
  );

  const paginatedFees = useMemo(
    () => fees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [fees, page, rowsPerPage],
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(fees.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [fees.length, page, rowsPerPage]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Taxas por pagamento
          </Typography>
          <Typography color="text.secondary">
            Configure a taxa percentual aplicada para cada carteira e meio de
            pagamento.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Nova taxa
        </Button>
      </Stack>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de taxas">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : paginatedFees.length > 0 ? (
              paginatedFees.map((taxa) => (
                <Box
                  key={taxa.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingFeeId(taxa.id)}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {taxa.carteira?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pagamento: {MEIO_PAGAMENTO_LABEL[taxa.meioPagamento]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taxa: {taxa.percentual.toFixed(2)}%
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        label={taxa.ativa ? 'Ativa' : 'Inativa'}
                        color={taxa.ativa ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma taxa cadastrada até o momento.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de taxas por pagamento">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Carteira</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Pagamento</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Taxa</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : paginatedFees.length > 0 ? (
                  paginatedFees.map((taxa) => (
                    <TableRow
                      key={taxa.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingFeeId(taxa.id)}
                    >
                      <TableCell>{taxa.carteira?.nome ?? '-'}</TableCell>
                      <TableCell>{MEIO_PAGAMENTO_LABEL[taxa.meioPagamento]}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {taxa.percentual.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={taxa.ativa ? 'Ativa' : 'Inativa'}
                          color={taxa.ativa ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      Nenhuma taxa cadastrada até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={fees.length}
          page={page}
          onPageChange={(_event, newPage) => {
            setPage(newPage);
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Itens por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          sx={{
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' },
              gap: 1,
              px: { xs: 1, sm: 2 },
            },
          }}
        />
      </Paper>

      <PaymentMethodWalletFeeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
      <PaymentMethodWalletFeeDialog
        open={editingFeeId !== null}
        feeId={editingFeeId}
        onClose={() => setEditingFeeId(null)}
      />
    </Stack>
  );
}
