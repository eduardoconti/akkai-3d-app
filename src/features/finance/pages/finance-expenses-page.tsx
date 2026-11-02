import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { NewExpenseDialog } from '@/features/finance';
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
  formatCentsForCsv,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  type DataTableColumn,
  type Despesa,
} from '@/shared';
import { getPaymentMethodLabel } from '@/features/sales/utils/format-sale-labels';
import { useShallow } from 'zustand/react/shallow';

export default function FinanceExpensesPage() {
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
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [searchInput, setSearchInput] = useState(paginacao.termo ?? '');
  const [dateRange, setDateRange] = useState({
    startValue: paginacao.dataInicio ?? '',
    endValue: paginacao.dataFim ?? '',
  });
  const [idCarteira, setIdCarteira] = useState<number | ''>(
    paginacao.idCarteira ?? '',
  );
  const [idFeira, setIdFeira] = useState<number | ''>(paginacao.idFeira ?? '');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    typeof categoriasDespesa
  >([]);
  const { openNewExpenseDialog } = useMainLayoutActions();

  const handleSearch = () => {
    void fetchDespesas({
      pagina: 1,
      termo: searchInput.trim(),
      dataInicio: convertDateToApiDateFormat(dateRange.startValue) ?? '',
      dataFim: convertDateToApiDateFormat(dateRange.endValue) ?? '',
      idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
      idCarteira: idCarteira === '' ? undefined : idCarteira,
      idFeira: idFeira === '' ? undefined : idFeira,
    });
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setSearchInput('');
    setCategoriasSelecionadas([]);
    setIdCarteira('');
    setIdFeira('');
    void fetchDespesas({
      pagina: 1,
      termo: '',
      dataInicio: '',
      dataFim: '',
      idsCategorias: [],
      idCarteira: undefined,
      idFeira: undefined,
    });
  };

  const handleOpenEdit = (despesa: Despesa) => {
    if (isSubmitting) return;
    setEditingDespesa(despesa);
  };

  const colunasDespesas: DataTableColumn<Despesa>[] = [
    {
      id: 'data',
      header: 'Data',
      mobile: 'eyebrow',
      exportValue: (despesa) => formatApiDateToDisplay(despesa.dataLancamento),
      cell: (despesa) => formatApiDateToDisplay(despesa.dataLancamento),
    },
    {
      id: 'descricao',
      header: 'Descrição',
      mobile: 'title',
      exportValue: (despesa) => despesa.descricao,
      cell: (despesa) => despesa.descricao,
    },
    {
      id: 'categoria',
      header: 'Categoria',
      exportValue: (despesa) => despesa.categoria?.nome ?? '',
      cell: (despesa) => despesa.categoria?.nome ?? '-',
    },
    {
      id: 'pagamento',
      header: 'Pagamento',
      exportValue: (despesa) => getPaymentMethodLabel(despesa.meioPagamento),
      cell: (despesa) => getPaymentMethodLabel(despesa.meioPagamento),
    },
    {
      id: 'carteira',
      header: 'Carteira',
      exportValue: (despesa) => despesa.carteira?.nome ?? '',
      cell: (despesa) => despesa.carteira?.nome ?? '-',
    },
    {
      id: 'feira',
      header: 'Feira',
      exportValue: (despesa) => despesa.feira?.nome ?? '',
      cell: (despesa) => despesa.feira?.nome ?? '-',
    },
    {
      id: 'valor',
      header: 'Valor',
      align: 'right',
      exportValue: (despesa) => formatCentsForCsv(despesa.valor),
      cell: (despesa) => (
        <Typography
          component="span"
          variant="inherit"
          fontWeight={700}
          color="error.main"
        >
          <CurrencyValue value={despesa.valor} />
        </Typography>
      ),
    },
  ];

  useEffect(() => {
    void fetchCarteiras();
    void fetchCategoriasDespesa();
    void fetchDespesas();
    void fetchFeiras();
  }, [fetchCarteiras, fetchCategoriasDespesa, fetchDespesas, fetchFeiras]);

  useEffect(() => {
    const idsCategoriasSelecionadas = paginacao.idsCategorias ?? [];
    setCategoriasSelecionadas(
      categoriasDespesa.filter((categoria) =>
        idsCategoriasSelecionadas.includes(categoria.id),
      ),
    );
  }, [categoriasDespesa, paginacao.idsCategorias]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Despesas"
        description="Registre saídas com categoria, pagamento e carteira para acompanhar os custos do negócio."
        actionLabel="Nova despesa"
        onAction={openNewExpenseDialog}
        breakpoint="lg"
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
      >
        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
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
          >
            <MenuItem value="">Todas</MenuItem>
            {feiras.map((feira) => (
              <MenuItem key={feira.id} value={feira.id}>
                {feira.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TextField
            fullWidth
            label="Pesquisar despesa"
            placeholder="Descrição, categoria, observação, carteira ou feira"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>
      </SearchFilterPanel>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Valor total das despesas
        </Typography>
        <Typography variant="h6" fontWeight={700} color="error.main">
          <CurrencyValue value={totalizadores.valorTotal} />
        </Typography>
      </Paper>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={despesas}
        columns={colunasDespesas}
        getRowId={(despesa) => despesa.id}
        ariaLabel="tabela de despesas"
        emptyMessage="Nenhuma despesa encontrada para os filtros informados."
        isLoading={isFetching}
        onRowClick={handleOpenEdit}
        exportFileName="despesas"
        pagination={{
          count: totalItens,
          page: Math.max(0, paginacao.pagina - 1),
          rowsPerPage: paginacao.tamanhoPagina,
          onPageChange: (novaPagina) => {
            void fetchDespesas({ pagina: novaPagina + 1 });
          },
          onRowsPerPageChange: (novoTamanho) => {
            void fetchDespesas({ pagina: 1, tamanhoPagina: novoTamanho });
          },
        }}
      />

      <NewExpenseDialog
        open={Boolean(editingDespesa)}
        onClose={() => setEditingDespesa(null)}
        despesa={editingDespesa}
      />
    </Stack>
  );
}
