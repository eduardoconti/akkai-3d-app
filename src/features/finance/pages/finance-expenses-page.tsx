import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
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
import { Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { NewExpenseDialog } from '@/features/finance';
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
  DateRangePickerField,
  EmptyState,
  LoadingState,
  PageHeader,
  formatCurrency,
  getMonthEndInput,
  getMonthStartInput,
  type Despesa,
} from '@/shared';
import { getPaymentMethodLabel } from '@/features/sales/utils/format-sale-labels';
import { useShallow } from 'zustand/react/shallow';

export default function FinanceExpensesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    carteiras,
    categoriasDespesa,
    despesas,
    fetchCarteiras,
    fetchCategoriasDespesa,
    fetchDespesas,
    fetchFeiras,
    fetchErrorMessage,
    feiras,
    isFetching,
    isSubmitting,
    paginacao,
    totalItens,
    totalizadores,
  } = useFinanceStore(
    useShallow((state) => ({
      carteiras: financeStoreSelectors.carteiras(state),
      categoriasDespesa: financeStoreSelectors.categoriasDespesa(state),
      despesas: financeStoreSelectors.despesas(state),
      fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
      fetchCategoriasDespesa:
        financeStoreSelectors.fetchCategoriasDespesa(state),
      fetchDespesas: financeStoreSelectors.fetchDespesas(state),
      fetchFeiras: financeStoreSelectors.fetchFeiras(state),
      fetchErrorMessage: financeStoreSelectors.fetchErrorMessage(state),
      feiras: financeStoreSelectors.feiras(state),
      isFetching: financeStoreSelectors.isFetching(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      paginacao: financeStoreSelectors.paginacao(state),
      totalItens: financeStoreSelectors.totalItens(state),
      totalizadores: financeStoreSelectors.totalizadores(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [dataInicio, setDataInicio] = useState(getMonthStartInput);
  const [dataFim, setDataFim] = useState(getMonthEndInput);
  const [idCarteira, setIdCarteira] = useState<number | ''>('');
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    typeof categoriasDespesa
  >([]);

  const handleSearch = () => {
    void fetchDespesas({
      pagina: 1,
      termo: searchInput.trim(),
      dataInicio: convertDateToApiDateFormat(dataInicio) ?? '',
      dataFim: convertDateToApiDateFormat(dataFim) ?? '',
      idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
      idCarteira: idCarteira === '' ? undefined : idCarteira,
      idFeira: idFeira === '' ? undefined : idFeira,
    });
  };

  const handleOpenEdit = (despesa: Despesa) => {
    if (isSubmitting) return;
    setEditingDespesa(despesa);
  };

  useEffect(() => {
    void fetchCarteiras();
    void fetchCategoriasDespesa();
    void fetchFeiras();
  }, [fetchCarteiras, fetchCategoriasDespesa, fetchFeiras]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchDespesas({
        pagina: 1,
        termo: searchInput.trim(),
        dataInicio: convertDateToApiDateFormat(dataInicio) ?? '',
        dataFim: convertDateToApiDateFormat(dataFim) ?? '',
        idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
        idCarteira: idCarteira === '' ? undefined : idCarteira,
        idFeira: idFeira === '' ? undefined : idFeira,
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [
    categoriasSelecionadas,
    dataFim,
    dataInicio,
    fetchDespesas,
    idCarteira,
    idFeira,
    searchInput,
  ]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Despesas"
        description="Registre saídas com categoria, pagamento e carteira para acompanhar os custos do negócio."
        actionLabel="Nova despesa"
        onAction={() => setDialogOpen(true)}
        breakpoint="lg"
      />

      <Grid container spacing={2} columns={{ xs: 12, md: 12, lg: 24 }}>
        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
          <DateRangePickerField
            label="Período"
            startValue={dataInicio}
            endValue={dataFim}
            onValueChange={({ startValue, endValue }) => {
              setDataInicio(startValue);
              setDataFim(endValue);
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
          <Autocomplete
            multiple
            options={categoriasDespesa}
            value={categoriasSelecionadas}
            onChange={(_event, value) => setCategoriasSelecionadas(value)}
            getOptionLabel={(option) => option.nome}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Categorias"
                placeholder="Selecione uma ou mais categorias"
              />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TextField
            select
            fullWidth
            label="Carteira"
            value={idCarteira}
            onChange={(event) =>
              setIdCarteira(
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
            helperText="Opcional"
          >
            <MenuItem value="">Todas</MenuItem>
            {carteiras.map((carteira) => (
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
            label="Feira"
            value={idFeira}
            onChange={(event) =>
              setIdFeira(
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
            helperText="Opcional"
          >
            <MenuItem value="">Todas</MenuItem>
            {feiras.map((feira) => (
              <MenuItem key={feira.id} value={feira.id}>
                {feira.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            fullWidth
            label="Pesquisar despesa"
            placeholder="Descrição, categoria, observação, carteira ou feira"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid
          size={{ xs: 12, md: 6, lg: 3 }}
          sx={{ display: 'flex', alignItems: 'flex-start' }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{ height: 56 }}
          >
            Pesquisar
          </Button>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Valor total das despesas
        </Typography>
        <Typography variant="h6" fontWeight={700} color="error.main">
          {formatCurrency(totalizadores.valorTotal)}
        </Typography>
      </Paper>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de despesas">
            {isFetching ? (
              <LoadingState />
            ) : despesas.length > 0 ? (
              despesas.map((despesa) => (
                <Box
                  key={despesa.id}
                  onClick={() => handleOpenEdit(despesa)}
                  sx={{
                    px: 2,
                    py: 2,
                    cursor: isSubmitting ? 'progress' : 'pointer',
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
                          {formatApiDateToDisplay(despesa.dataLancamento)}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {despesa.descricao}
                        </Typography>
                      </Box>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        color="error.main"
                      >
                        {formatCurrency(despesa.valor)}
                      </Typography>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Categoria: {despesa.categoria?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pagamento: {getPaymentMethodLabel(despesa.meioPagamento)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Carteira: {despesa.carteira?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Feira: {despesa.feira?.nome ?? '-'}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhuma despesa encontrada para os filtros informados." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de despesas">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Data</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Categoria</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Pagamento</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Carteira</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Feira</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Valor</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : despesas.length > 0 ? (
                  despesas.map((despesa) => (
                    <TableRow
                      key={despesa.id}
                      hover
                      onClick={() => handleOpenEdit(despesa)}
                      sx={{ cursor: isSubmitting ? 'progress' : 'pointer' }}
                    >
                      <TableCell>
                        {formatApiDateToDisplay(despesa.dataLancamento)}
                      </TableCell>
                      <TableCell>{despesa.descricao}</TableCell>
                      <TableCell>{despesa.categoria?.nome ?? '-'}</TableCell>
                      <TableCell>
                        {getPaymentMethodLabel(despesa.meioPagamento)}
                      </TableCell>
                      <TableCell>{despesa.carteira?.nome ?? '-'}</TableCell>
                      <TableCell>{despesa.feira?.nome ?? '-'}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: 'error.main', fontWeight: 700 }}
                      >
                        {formatCurrency(despesa.valor)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ p: 0 }}>
                      <EmptyState message="Nenhuma despesa encontrada para os filtros informados." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalItens}
          page={Math.max(0, paginacao.pagina - 1)}
          rowsPerPage={paginacao.tamanhoPagina}
          onPageChange={(_event, newPage) => {
            void fetchDespesas({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchDespesas({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <NewExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      <NewExpenseDialog
        open={Boolean(editingDespesa)}
        onClose={() => setEditingDespesa(null)}
        despesa={editingDespesa}
      />
    </Stack>
  );
}
