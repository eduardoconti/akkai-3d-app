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
import { useShallow } from 'zustand/react/shallow';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import { MEIO_PAGAMENTO_LABEL } from '@/features/finance/types/finance-form';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
} from '@/shared';
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
      <PageHeader
        title="Taxas por pagamento"
        description="Configure a taxa percentual aplicada para cada carteira e meio de pagamento."
        actionLabel="Nova taxa"
        onAction={() => setDialogOpen(true)}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de taxas">
            {isFetching ? (
              <LoadingState />
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
              <EmptyState message="Nenhuma taxa cadastrada até o momento." />
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
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <LoadingState />
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
                      <TableCell>
                        {MEIO_PAGAMENTO_LABEL[taxa.meioPagamento]}
                      </TableCell>
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
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <EmptyState message="Nenhuma taxa cadastrada até o momento." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={fees.length}
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
