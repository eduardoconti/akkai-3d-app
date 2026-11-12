import { useEffect, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useShallow } from 'zustand/react/shallow';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import { MEIO_PAGAMENTO_LABEL } from '@/features/finance/types/finance-form';
import {
  DEFAULT_PAGE_SIZE,
  type DataTableColumn,
  PageHeader,
  ResponsiveDataTable,
  StatusChip,
} from '@/shared';
import type { TaxaMeioPagamentoCarteira } from '@/shared/lib/types/domain';
import PaymentMethodWalletFeeDialog from '../components/payment-method-wallet-fee-dialog';

const colunasTaxas: DataTableColumn<TaxaMeioPagamentoCarteira>[] = [
  {
    id: 'carteira',
    header: 'Carteira',
    mobile: 'title',
    cell: (taxa) => taxa.carteira?.nome ?? '-',
  },
  {
    id: 'pagamento',
    header: 'Pagamento',
    cell: (taxa) => MEIO_PAGAMENTO_LABEL[taxa.meioPagamento],
  },
  {
    id: 'taxa',
    header: 'Taxa',
    align: 'right',
    cell: (taxa) => (
      <Typography component="span" variant="inherit" fontWeight={700}>
        {taxa.percentual.toFixed(2)}%
      </Typography>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    mobile: 'badge',
    cell: (taxa) => (
      <StatusChip
        label={taxa.ativa ? 'Ativa' : 'Inativa'}
        tone={taxa.ativa ? 'success' : 'default'}
      />
    ),
  },
];

export default function FinancePaymentMethodWalletFeesPage() {
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
  const [editingFeeId, setEditingFeeId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const { openPaymentMethodWalletFeeDialog } = useMainLayoutActions();

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
        onAction={openPaymentMethodWalletFeeDialog}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={paginatedFees}
        columns={colunasTaxas}
        getRowId={(taxa) => taxa.id}
        ariaLabel="tabela de taxas por pagamento"
        emptyMessage="Nenhuma taxa cadastrada até o momento."
        isLoading={isFetching}
        onRowClick={(taxa) => setEditingFeeId(taxa.id)}
        pagination={{
          count: fees.length,
          page,
          rowsPerPage,
          onPageChange: setPage,
          onRowsPerPageChange: (novoTamanho) => {
            setRowsPerPage(novoTamanho);
            setPage(0);
          },
        }}
      />

      <PaymentMethodWalletFeeDialog
        open={editingFeeId !== null}
        feeId={editingFeeId}
        onClose={() => setEditingFeeId(null)}
      />
    </Stack>
  );
}
