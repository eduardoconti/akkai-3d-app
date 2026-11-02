import { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import WalletTransferDialog from '@/features/finance/components/wallet-transfer-dialog';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  convertDateToApiDateFormat,
  formatApiDateToDisplay,
} from '@/features/finance/types/finance-form';
import {
  CurrencyValue,
  DateRangePickerField,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  type DataTableColumn,
  type TransferenciaCarteira,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function FinanceWalletTransfersPage() {
  const {
    carteiras,
    fetchCarteiras,
    fetchErrorMessage,
    fetchTransferenciasCarteira,
    isFetching,
    paginacaoTransferencias,
    totalItensTransferencias,
    transferenciasCarteira,
  } = useFinanceStore(
    useShallow((state) => ({
      carteiras: financeStoreSelectors.carteiras(state),
      fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
      fetchErrorMessage: financeStoreSelectors.fetchErrorMessage(state),
      fetchTransferenciasCarteira:
        financeStoreSelectors.fetchTransferenciasCarteira(state),
      isFetching: financeStoreSelectors.isFetching(state),
      paginacaoTransferencias:
        financeStoreSelectors.paginacaoTransferencias(state),
      totalItensTransferencias:
        financeStoreSelectors.totalItensTransferencias(state),
      transferenciasCarteira:
        financeStoreSelectors.transferenciasCarteira(state),
    })),
  );
  const [editingTransferencia, setEditingTransferencia] =
    useState<TransferenciaCarteira | null>(null);
  const [dateRange, setDateRange] = useState({
    startValue: paginacaoTransferencias.dataInicio ?? '',
    endValue: paginacaoTransferencias.dataFim ?? '',
  });
  const [idCarteiraOrigem, setIdCarteiraOrigem] = useState<number | ''>(
    paginacaoTransferencias.idCarteiraOrigem ?? '',
  );
  const [idCarteiraDestino, setIdCarteiraDestino] = useState<number | ''>(
    paginacaoTransferencias.idCarteiraDestino ?? '',
  );
  const { openWalletTransferDialog } = useMainLayoutActions();

  const carteirasOrdenadas = useMemo(
    () => [...carteiras].sort((a, b) => a.nome.localeCompare(b.nome)),
    [carteiras],
  );

  const handleSearch = () => {
    void fetchTransferenciasCarteira({
      pagina: 1,
      dataInicio: convertDateToApiDateFormat(dateRange.startValue) ?? '',
      dataFim: convertDateToApiDateFormat(dateRange.endValue) ?? '',
      idCarteiraOrigem: idCarteiraOrigem === '' ? undefined : idCarteiraOrigem,
      idCarteiraDestino:
        idCarteiraDestino === '' ? undefined : idCarteiraDestino,
    });
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setIdCarteiraOrigem('');
    setIdCarteiraDestino('');
    void fetchTransferenciasCarteira({
      pagina: 1,
      dataInicio: '',
      dataFim: '',
      idCarteiraOrigem: undefined,
      idCarteiraDestino: undefined,
    });
  };

  const handleOpenEdit = (transferencia: TransferenciaCarteira) => {
    setEditingTransferencia(transferencia);
  };

  const colunasTransferencias: DataTableColumn<TransferenciaCarteira>[] = [
    {
      id: 'data',
      header: 'Data',
      mobile: 'title',
      cell: (transferencia) =>
        formatApiDateToDisplay(transferencia.dataTransferencia),
    },
    {
      id: 'origem',
      header: 'Carteira de origem',
      cell: (transferencia) => transferencia.carteiraOrigem?.nome ?? '-',
    },
    {
      id: 'destino',
      header: 'Carteira de destino',
      cell: (transferencia) => transferencia.carteiraDestino?.nome ?? '-',
    },
    {
      id: 'valor',
      header: 'Valor',
      align: 'right',
      cell: (transferencia) => (
        <Typography component="span" variant="inherit" fontWeight={700}>
          <CurrencyValue value={transferencia.valor} />
        </Typography>
      ),
    },
  ];

  useEffect(() => {
    void fetchCarteiras();
    void fetchTransferenciasCarteira();
  }, [fetchCarteiras, fetchTransferenciasCarteira]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Transferências"
        description="Pesquise movimentações de valores entre carteiras financeiras."
        actionLabel="Nova transferência"
        onAction={openWalletTransferDialog}
        breakpoint="lg"
      />

      <SearchFilterPanel
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
        columns={{ xs: 12, md: 12, lg: 12 }}
      >
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            select
            fullWidth
            label="Carteira de origem"
            value={idCarteiraOrigem}
            onChange={(event) =>
              setIdCarteiraOrigem(
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
          >
            <MenuItem value="">Todas</MenuItem>
            {carteirasOrdenadas.map((carteira) => (
              <MenuItem key={carteira.id} value={carteira.id}>
                {carteira.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            select
            fullWidth
            label="Carteira de destino"
            value={idCarteiraDestino}
            onChange={(event) =>
              setIdCarteiraDestino(
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
          >
            <MenuItem value="">Todas</MenuItem>
            {carteirasOrdenadas.map((carteira) => (
              <MenuItem key={carteira.id} value={carteira.id}>
                {carteira.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={transferenciasCarteira}
        columns={colunasTransferencias}
        getRowId={(transferencia) => transferencia.id}
        ariaLabel="tabela de transferências"
        emptyMessage="Nenhuma transferência encontrada para os filtros informados."
        isLoading={isFetching}
        onRowClick={handleOpenEdit}
        pagination={{
          count: totalItensTransferencias,
          page: Math.max(0, paginacaoTransferencias.pagina - 1),
          rowsPerPage: paginacaoTransferencias.tamanhoPagina,
          onPageChange: (novaPagina) => {
            void fetchTransferenciasCarteira({ pagina: novaPagina + 1 });
          },
          onRowsPerPageChange: (novoTamanho) => {
            void fetchTransferenciasCarteira({
              pagina: 1,
              tamanhoPagina: novoTamanho,
            });
          },
        }}
      />

      <WalletTransferDialog
        open={Boolean(editingTransferencia)}
        onClose={() => setEditingTransferencia(null)}
        onSaved={() => undefined}
        transferencia={editingTransferencia}
      />
    </Stack>
  );
}
