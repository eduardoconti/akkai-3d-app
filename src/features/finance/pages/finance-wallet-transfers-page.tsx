import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
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
  AppTablePagination,
  CurrencyValue,
  DateRangePickerField,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchFilterPanel,
  type TransferenciaCarteira,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function FinanceWalletTransfersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack
            divider={<Divider flexItem />}
            aria-label="lista de transferências"
          >
            {isFetching ? (
              <LoadingState />
            ) : transferenciasCarteira.length > 0 ? (
              transferenciasCarteira.map((transferencia) => (
                <Box
                  key={transferencia.id}
                  onClick={() => handleOpenEdit(transferencia)}
                  sx={{
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatApiDateToDisplay(
                            transferencia.dataTransferencia,
                          )}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {transferencia.carteiraOrigem?.nome ?? '-'} para{' '}
                          {transferencia.carteiraDestino?.nome ?? '-'}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        <CurrencyValue value={transferencia.valor} />
                      </Typography>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Origem: {transferencia.carteiraOrigem?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Destino: {transferencia.carteiraDestino?.nome ?? '-'}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhuma transferência encontrada para os filtros informados." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de transferências">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Data</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Carteira de origem</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Carteira de destino</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Valor</strong>
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
                ) : transferenciasCarteira.length > 0 ? (
                  transferenciasCarteira.map((transferencia) => (
                    <TableRow
                      key={transferencia.id}
                      hover
                      onClick={() => handleOpenEdit(transferencia)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        {formatApiDateToDisplay(
                          transferencia.dataTransferencia,
                        )}
                      </TableCell>
                      <TableCell>
                        {transferencia.carteiraOrigem?.nome ?? '-'}
                      </TableCell>
                      <TableCell>
                        {transferencia.carteiraDestino?.nome ?? '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        <CurrencyValue value={transferencia.valor} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <EmptyState message="Nenhuma transferência encontrada para os filtros informados." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalItensTransferencias}
          page={Math.max(0, paginacaoTransferencias.pagina - 1)}
          rowsPerPage={paginacaoTransferencias.tamanhoPagina}
          onPageChange={(_event, newPage) => {
            void fetchTransferenciasCarteira({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchTransferenciasCarteira({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <WalletTransferDialog
        open={Boolean(editingTransferencia)}
        onClose={() => setEditingTransferencia(null)}
        onSaved={() => undefined}
        transferencia={editingTransferencia}
      />
    </Stack>
  );
}
