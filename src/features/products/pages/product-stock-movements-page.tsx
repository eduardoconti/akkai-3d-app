import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Checkbox,
  Chip,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  listAllProducts,
  listProductStockMovements,
} from '../api/products-api';
import {
  DateRangePickerField,
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  getProblemDetailsFromError,
  type DataTableColumn,
  type DateRangeValue,
  type MovimentacaoEstoque,
  type OrigemMovimentacaoEstoque,
  type PesquisaPaginadaMovimentacoesEstoque,
  type ProblemDetails,
  type Produto,
  type ResultadoPaginado,
  type TipoMovimentacaoEstoque,
  StatusChip,
  summarizeSelection,
} from '@/shared';

type TipoOption = {
  value: TipoMovimentacaoEstoque;
  label: string;
};

type OrigemOption = {
  value: OrigemMovimentacaoEstoque;
  label: string;
};

type FiltrosAplicados = PesquisaPaginadaMovimentacoesEstoque;

const TIPO_OPTIONS: TipoOption[] = [
  { value: 'E', label: 'Entrada' },
  { value: 'S', label: 'Saída' },
];

const ORIGEM_OPTIONS: OrigemOption[] = [
  { value: 'COMPRA', label: 'Compra' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'PERDA', label: 'Perda' },
  { value: 'PRODUCAO', label: 'Produção' },
  { value: 'CONSIGNACAO', label: 'Consignação' },
  { value: 'DEVOLUCAO', label: 'Devolução' },
  { value: 'TROCA', label: 'Troca' },
  { value: 'VENDA', label: 'Venda' },
];

const ORIGENS_PADRAO = ORIGEM_OPTIONS.filter(
  (origem) => origem.value !== 'VENDA',
);

const FILTROS_INICIAIS: FiltrosAplicados = {
  pagina: 1,
  tamanhoPagina: DEFAULT_PAGE_SIZE,
  tipos: TIPO_OPTIONS.map((tipo) => tipo.value),
  origens: ORIGENS_PADRAO.map((origem) => origem.value),
};

const TODOS_OS_TIPOS = 'TODOS';
type TipoFiltro = TipoMovimentacaoEstoque | typeof TODOS_OS_TIPOS;
const ORIGENS_PADRAO_VALORES = ORIGENS_PADRAO.map((origem) => origem.value);

function getTipoLabel(tipo: TipoMovimentacaoEstoque): string {
  return tipo === 'E' ? 'Entrada' : 'Saída';
}

function getTipoColor(tipo: TipoMovimentacaoEstoque): 'success' | 'error' {
  return tipo === 'E' ? 'success' : 'error';
}

function getOrigemLabel(movimentacao: MovimentacaoEstoque): string {
  if (movimentacao.origem === 'VENDA' && movimentacao.idVenda) {
    return `Venda #${movimentacao.idVenda}`;
  }

  return (
    ORIGEM_OPTIONS.find((origem) => origem.value === movimentacao.origem)
      ?.label ?? movimentacao.origem
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function formatProductOption(produto: Produto) {
  return `${produto.nome} (${produto.codigo})`;
}

export default function ProductStockMovementsPage() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startValue: '',
    endValue: '',
  });
  const [tipo, setTipo] = useState<TipoFiltro>(TODOS_OS_TIPOS);
  const [origens, setOrigens] = useState<OrigemMovimentacaoEstoque[]>(
    ORIGENS_PADRAO_VALORES,
  );
  const [produto, setProduto] = useState<Produto | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [resultado, setResultado] =
    useState<ResultadoPaginado<MovimentacaoEstoque> | null>(null);
  const [filtrosAplicados, setFiltrosAplicados] =
    useState<FiltrosAplicados>(FILTROS_INICIAIS);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [productsMessage, setProductsMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const selectedTipos = useMemo<TipoMovimentacaoEstoque[]>(
    () =>
      tipo === TODOS_OS_TIPOS
        ? TIPO_OPTIONS.map((option) => option.value)
        : [tipo],
    [tipo],
  );
  const selectedOrigens = origens;
  const semOrigem = origens.length === 0;

  const fetchMovimentacoes = useCallback(async (query: FiltrosAplicados) => {
    setProblem(null);
    setIsLoading(true);

    try {
      const response = await listProductStockMovements(query);
      setResultado(response);
      setFiltrosAplicados(query);
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
      setResultado(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoadingProducts(true);
    listAllProducts()
      .then((items) => {
        setProdutos(items);
        setProductsMessage(null);
      })
      .catch((error) => {
        setProductsMessage(getProblemDetailsFromError(error).detail);
      })
      .finally(() => setIsLoadingProducts(false));
  }, []);

  useEffect(() => {
    void fetchMovimentacoes(FILTROS_INICIAIS);
  }, [fetchMovimentacoes]);

  const buildFilters = (
    pagina: number,
    tamanhoPagina: number,
  ): FiltrosAplicados => ({
    pagina,
    tamanhoPagina,
    dataInicio: dateRange.startValue || undefined,
    dataFim: dateRange.endValue || undefined,
    tipos: selectedTipos,
    origens: selectedOrigens,
    idProduto: produto?.id,
  });

  const handleSearch = () => {
    void fetchMovimentacoes(
      buildFilters(1, resultado?.tamanhoPagina ?? DEFAULT_PAGE_SIZE),
    );
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setTipo(TODOS_OS_TIPOS);
    setOrigens(ORIGENS_PADRAO_VALORES);
    setProduto(null);
    void fetchMovimentacoes(FILTROS_INICIAIS);
  };

  const renderOrigem = (movimentacao: MovimentacaoEstoque) => (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
      <span>{getOrigemLabel(movimentacao)}</span>
      {movimentacao.brinde ? (
        <Chip label="Brinde" size="small" color="warning" variant="outlined" />
      ) : null}
    </Stack>
  );

  const movimentacaoColumns: DataTableColumn<MovimentacaoEstoque>[] = [
    {
      id: 'data',
      header: 'Data',
      exportValue: (movimentacao) => formatDateTime(movimentacao.dataInclusao),
      cell: (movimentacao) => formatDateTime(movimentacao.dataInclusao),
    },
    {
      id: 'produto',
      header: 'Produto',
      mobile: 'title',
      exportValue: (movimentacao) =>
        movimentacao.produto?.nome ?? `Produto #${movimentacao.idProduto}`,
      cell: (movimentacao) => (
        <Stack spacing={0.25}>
          <Typography fontWeight={600}>
            {movimentacao.produto?.nome ?? `Produto #${movimentacao.idProduto}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {movimentacao.produto
              ? `Código ${movimentacao.produto.codigo}`
              : `ID ${movimentacao.idProduto}`}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'tipo',
      header: 'Tipo',
      mobile: 'badge',
      exportValue: (movimentacao) => getTipoLabel(movimentacao.tipo),
      cell: (movimentacao) => (
        <StatusChip
          label={getTipoLabel(movimentacao.tipo)}
          tone={getTipoColor(movimentacao.tipo)}
        />
      ),
    },
    {
      id: 'origem',
      header: 'Origem',
      exportValue: (movimentacao) =>
        movimentacao.brinde
          ? `${getOrigemLabel(movimentacao)} (Brinde)`
          : getOrigemLabel(movimentacao),
      cell: renderOrigem,
    },
    {
      id: 'quantidade',
      header: 'Quantidade',
      align: 'right',
      exportValue: (movimentacao) => movimentacao.quantidade,
      cell: (movimentacao) => movimentacao.quantidade,
    },
    {
      id: 'usuario',
      header: 'Usuário',
      mobile: 'hidden',
      exportValue: (movimentacao) => movimentacao.usuario,
      cell: (movimentacao) => movimentacao.usuario,
    },
  ];

  const totalItens = resultado?.totalItens ?? 0;
  const paginaAtual = resultado?.pagina ?? filtrosAplicados.pagina;
  const tamanhoPagina =
    resultado?.tamanhoPagina ?? filtrosAplicados.tamanhoPagina;
  const movimentacoes = resultado?.itens ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Movimentações de estoque"
        description="Consulte entradas, saídas e ajustes dos produtos por período, origem e produto."
      />

      {productsMessage ? (
        <Alert severity="warning">{productsMessage}</Alert>
      ) : null}

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isLoading}
        searchDisabled={semOrigem}
      >
        <Grid size={{ xs: 12, md: 7, lg: 5 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>

        {/* Só duas opções: um select simples em vez de chips. */}
        <Grid size={{ xs: 12, md: 5, lg: 3 }}>
          <TextField
            select
            fullWidth
            label="Tipo"
            value={tipo}
            onChange={(event) => setTipo(event.target.value as TipoFiltro)}
          >
            <MenuItem value={TODOS_OS_TIPOS}>Todos</MenuItem>
            {TIPO_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Várias origens: caixas de seleção, com um resumo em texto no campo. */}
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <TextField
            select
            fullWidth
            label="Origem"
            value={origens}
            error={semOrigem}
            helperText={
              semOrigem ? 'Selecione ao menos uma origem.' : undefined
            }
            onChange={(event) => {
              const { value } = event.target as { value: unknown };
              setOrigens(value as OrigemMovimentacaoEstoque[]);
            }}
            slotProps={{
              select: {
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) =>
                  summarizeSelection(
                    selected as OrigemMovimentacaoEstoque[],
                    ORIGEM_OPTIONS,
                    'origens',
                  ) || 'Nenhuma',
              },
            }}
          >
            {ORIGEM_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} dense>
                <Checkbox
                  size="small"
                  checked={origens.includes(option.value)}
                  sx={{ py: 0, pl: 0 }}
                />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <Autocomplete
            options={produtos}
            value={produto}
            loading={isLoadingProducts}
            getOptionLabel={formatProductOption}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_event, value) => setProduto(value)}
            renderInput={(params) => (
              <TextField {...params} label="Produto" placeholder="Todos" />
            )}
          />
        </Grid>
      </SearchFilterPanel>

      <FormFeedbackAlert message={problem?.detail} />

      <ResponsiveDataTable
        rows={movimentacoes}
        columns={movimentacaoColumns}
        getRowId={(movimentacao) => movimentacao.id}
        ariaLabel="tabela de movimentações de estoque"
        emptyMessage="Nenhuma movimentação encontrada para os filtros informados."
        isLoading={isLoading}
        exportFileName="movimentacoes-estoque"
        pagination={{
          count: totalItens,
          page: Math.max(0, paginaAtual - 1),
          rowsPerPage: tamanhoPagina,
          onPageChange: (newPage) => {
            void fetchMovimentacoes({
              ...filtrosAplicados,
              pagina: newPage + 1,
            });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchMovimentacoes({
              ...filtrosAplicados,
              pagina: 1,
              tamanhoPagina: newRowsPerPage,
            });
          },
        }}
      />
    </Stack>
  );
}
