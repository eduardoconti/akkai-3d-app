import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import {
  listAllProducts,
  listProductStockMovements,
} from '../api/products-api';
import {
  DateRangePickerField,
  DEFAULT_PAGE_SIZE,
  EmptyState,
  FormFeedbackAlert,
  LoadingState,
  PAGINATED_SEARCH_PAGE_SIZE_OPTIONS,
  SearchFilterPanel,
  getProblemDetailsFromError,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

  const selectedTipos = useMemo(
    () => tipos.map((tipo) => tipo.value),
    [tipos],
  );
  const selectedOrigens = useMemo(
    () => origens.map((origem) => origem.value),
    [origens],
  );

  const fetchMovimentacoes = useCallback(
    async (query: FiltrosAplicados) => {
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
    },
    [],
  );

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

  const renderCard = (movimentacao: MovimentacaoEstoque) => (
    <Box key={movimentacao.id} sx={{ px: 2, py: 2 }}>
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {movimentacao.produto?.nome ?? `Produto #${movimentacao.idProduto}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {movimentacao.produto
                ? `Código ${movimentacao.produto.codigo}`
                : `ID ${movimentacao.idProduto}`}
            </Typography>
          </Box>

          <Chip
            label={getTipoLabel(movimentacao.tipo)}
            size="small"
            color={getTipoColor(movimentacao.tipo)}
          />
        </Stack>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Data
            </Typography>
            <Typography fontWeight={600}>
              {formatDateTime(movimentacao.dataInclusao)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Quantidade
            </Typography>
            <Typography fontWeight={700}>{movimentacao.quantidade}</Typography>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary">
              Origem
            </Typography>
            {renderOrigem(movimentacao)}
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );

  const totalItens = resultado?.totalItens ?? 0;
  const paginaAtual = resultado?.pagina ?? filtrosAplicados.pagina;
  const tamanhoPagina =
    resultado?.tamanhoPagina ?? filtrosAplicados.tamanhoPagina;
  const movimentacoes = resultado?.itens ?? [];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Movimentações de estoque
        </Typography>
        <Typography color="text.secondary">
          Consulte entradas, saídas e ajustes dos produtos por período, origem e
          produto.
        </Typography>
      </Box>

      {productsMessage ? <Alert severity="warning">{productsMessage}</Alert> : null}

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

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState />
        ) : isMobile ? (
          <Stack divider={<Divider flexItem />}>
            {movimentacoes.length > 0 ? (
              movimentacoes.map(renderCard)
            ) : (
              <EmptyState message="Nenhuma movimentação encontrada para os filtros informados." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de movimentações de estoque">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Data</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Produto</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Tipo</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Origem</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Quantidade</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Usuário</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movimentacoes.length > 0 ? (
                  movimentacoes.map((movimentacao) => (
                    <TableRow key={movimentacao.id}>
                      <TableCell>
                        {formatDateTime(movimentacao.dataInclusao)}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography fontWeight={600}>
                            {movimentacao.produto?.nome ??
                              `Produto #${movimentacao.idProduto}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {movimentacao.produto
                              ? `Código ${movimentacao.produto.codigo}`
                              : `ID ${movimentacao.idProduto}`}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getTipoLabel(movimentacao.tipo)}
                          size="small"
                          color={getTipoColor(movimentacao.tipo)}
                        />
                      </TableCell>
                      <TableCell>{renderOrigem(movimentacao)}</TableCell>
                      <TableCell align="right">
                        {movimentacao.quantidade}
                      </TableCell>
                      <TableCell>{movimentacao.usuario}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0 }}>
                      <EmptyState message="Nenhuma movimentação encontrada para os filtros informados." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalItens}
          page={Math.max(0, paginaAtual - 1)}
          onPageChange={(_event, newPage) => {
            void fetchMovimentacoes({
              ...filtrosAplicados,
              pagina: newPage + 1,
            });
          }}
          rowsPerPage={tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchMovimentacoes({
              ...filtrosAplicados,
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
          rowsPerPageOptions={PAGINATED_SEARCH_PAGE_SIZE_OPTIONS}
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
    </Stack>
  );
}
