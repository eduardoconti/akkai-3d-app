import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { AccountBalanceWallet, Edit } from '@mui/icons-material';
import { EditWalletDialog, WalletAdjustmentDialog } from '@/features/finance';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  type Carteira,
  CurrencyValue,
  DEFAULT_PAGE_SIZE,
  type DataTableColumn,
  PageHeader,
  ResponsiveDataTable,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function FinanceWalletsPage() {
  const { carteiras, fetchCarteiras, fetchErrorMessage, isFetching } =
    useFinanceStore(
      useShallow((state) => ({
        carteiras: financeStoreSelectors.carteiras(state),
        fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
        fetchErrorMessage: financeStoreSelectors.fetchErrorMessage(state),
        isFetching: financeStoreSelectors.isFetching(state),
      })),
    );
  const [editingWalletId, setEditingWalletId] = useState<number | null>(null);
  const [adjustingWalletId, setAdjustingWalletId] = useState<number | null>(
    null,
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const { openNewWalletDialog } = useMainLayoutActions();

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
  const adjustingWallet = useMemo(
    () =>
      adjustingWalletId === null
        ? null
        : (wallets.find((carteira) => carteira.id === adjustingWalletId) ??
          null),
    [adjustingWalletId, wallets],
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(wallets.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, rowsPerPage, wallets.length]);

  const walletColumns: DataTableColumn<Carteira>[] = [
    { id: 'nome', header: 'Nome', mobile: 'title', cell: (c) => c.nome },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (c) => (
        <Chip
          size="small"
          label={c.ativa ? 'Ativa' : 'Inativa'}
          color={c.ativa ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      id: 'saldo',
      header: 'Saldo atual',
      align: 'right',
      cell: (c) => (
        <Typography
          component="span"
          variant="inherit"
          fontWeight={700}
          color={c.saldoAtual < 0 ? 'error.main' : 'success.main'}
        >
          <CurrencyValue value={c.saldoAtual} />
        </Typography>
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (c) => (
        <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
          <Tooltip title="Editar carteira">
            <IconButton
              size="small"
              aria-label={`Editar carteira ${c.nome}`}
              onClick={(event) => {
                event.stopPropagation();
                setEditingWalletId(c.id);
              }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ajustar saldo">
            <IconButton
              size="small"
              color="primary"
              aria-label={`Ajustar saldo da carteira ${c.nome}`}
              onClick={(event) => {
                event.stopPropagation();
                setAdjustingWalletId(c.id);
              }}
            >
              <AccountBalanceWallet fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Carteiras"
        description="Cadastre os destinos de entrada e saída para acompanhar o saldo por carteira."
        actionLabel="Nova carteira"
        onAction={openNewWalletDialog}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={paginatedWallets}
        columns={walletColumns}
        getRowId={(carteira) => carteira.id}
        ariaLabel="tabela de carteiras"
        emptyMessage="Nenhuma carteira cadastrada até o momento."
        isLoading={isFetching}
        onRowClick={(carteira) => setEditingWalletId(carteira.id)}
        pagination={{
          count: wallets.length,
          page,
          rowsPerPage,
          onPageChange: setPage,
          onRowsPerPageChange: (newRowsPerPage) => {
            setRowsPerPage(newRowsPerPage);
            setPage(0);
          },
        }}
      />

      <EditWalletDialog
        open={editingWalletId !== null}
        walletId={editingWalletId}
        onClose={() => setEditingWalletId(null)}
        onUpdated={fetchCarteiras}
      />
      <WalletAdjustmentDialog
        open={adjustingWalletId !== null}
        carteira={adjustingWallet}
        onClose={() => setAdjustingWalletId(null)}
        onSaved={fetchCarteiras}
      />
    </Stack>
  );
}
