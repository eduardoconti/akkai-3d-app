import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Chip,
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
  const [tipos, setTipos] = useState<TipoOption[]>(TIPO_OPTIONS);
  const [origens, setOrigens] = useState<OrigemOption[]>(ORIGENS_PADRAO);
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

  const selectedTipos = useMemo(() => tipos.map((tipo) => tipo.value), [tipos]);
  const selectedOrigens = useMemo(
    () => origens.map((origem) => origem.value),
    [origens],
  );

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
    setTipos(TIPO_OPTIONS);
    setOrigens(ORIGENS_PADRAO);
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
      cell: (movimentacao) => formatDateTime(movimentacao.dataInclusao),
    },
    {
      id: 'produto',
      header: 'Produto',
      mobile: 'title',
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
      cell: (movimentacao) => (
        <Chip
          label={getTipoLabel(movimentacao.tipo)}
          size="small"
          color={getTipoColor(movimentacao.tipo)}
        />
      ),
    },
    { id: 'origem', header: 'Origem', cell: renderOrigem },
    {
      id: 'quantidade',
      header: 'Quantidade',
      align: 'right',
      cell: (movimentacao) => movimentacao.quantidade,
    },
    {
      id: 'usuario',
      header: 'Usuário',
      mobile: 'hidden',
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
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, md: 5, lg: 5 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3, lg: 4 }}>
          <Autocomplete
            multiple
            options={TIPO_OPTIONS}
            value={tipos}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) =>
              option.value === value.value
            }
            onChange={(_event, value) => setTipos(value)}
            renderInput={(params) => (
              <TextField {...params} label="Tipo" placeholder="Tipo" />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4, lg: 11 }}>
          <Autocomplete
            multiple
            options={ORIGEM_OPTIONS}
            value={origens}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) =>
              option.value === value.value
            }
            onChange={(_event, value) => setOrigens(value)}
            renderInput={(params) => (
              <TextField {...params} label="Origem" placeholder="Origem" />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 20 }}>
          <Autocomplete
            options={produtos}
            value={produto}
            loading={isLoadingProducts}
            getOptionLabel={formatProductOption}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_event, value) => setProduto(value)}
            renderInput={(params) => (
              <TextField {...params} label="Produto" placeholder="Produto" />
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
