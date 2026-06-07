import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  Divider,
  MenuItem,
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
import { listAllCategories } from '@/features/products/api/products-api';
import {
  getBestSellingProducts,
  type BestSellingProductItem,
  type BestSellingProductsResponse,
} from '@/features/reports/api/reports-api';
import { listFairs } from '@/features/sales/api/sales-api';
import { getSaleTypeLabel } from '@/features/sales/utils/format-sale-labels';
import {
  DateRangePickerField,
  FormFeedbackAlert,
  SearchFilterPanel,
  getMonthRangeInput,
  getProblemDetailsFromError,
  type Categoria,
  type Feira,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';

const TAMANHO_PAGINA_INICIAL = 10;

function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function getPeriodoLabel(result: BestSellingProductsResponse | null) {
  if (!result) {
    return null;
  }

  if (result.dataInicio === result.dataFim) {
    return `Período consultado: ${formatApiDateToDisplay(result.dataInicio)}`;
  }

  return `Período consultado: ${formatApiDateToDisplay(result.dataInicio)} até ${formatApiDateToDisplay(result.dataFim)}`;
}

function getProductRowKey(
  item: BestSellingProductItem,
  index: number,
  pagina: number,
): string {
  return [
    pagina,
    index,
    item.idProduto ?? 'avulso',
    item.codigo ?? 'sem-codigo',
    item.nomeProduto,
    item.categoria?.id ?? 'sem-categoria',
  ].join('-');
}

interface AppliedFilters {
  dataInicio: string;
  dataFim: string;
  tipoVenda: 'TODOS' | TipoVenda;
  idFeira: number | '';
  categoriasSelecionadas: Categoria[];
}

export default function ReportsBestSellingProductsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dateRange, setDateRange] = useState(getMonthRangeInput);
  const [tipoVenda, setTipoVenda] = useState<'TODOS' | TipoVenda>('TODOS');
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    Categoria[]
  >([]);
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [result, setResult] = useState<BestSellingProductsResponse | null>(
    null,
  );
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null,
  );
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingFeiras, setIsLoadingFeiras] = useState(false);

  useEffect(() => {
    let active = true;

    async function carregarCategorias() {
      setIsLoadingFilters(true);

      try {
        const categoriasResponse = await listAllCategories();

        if (active) {
          setCategorias(categoriasResponse);
        }
      } catch (error) {
        if (active) {
          setProblem(getProblemDetailsFromError(error));
        }
      } finally {
        if (active) {
          setIsLoadingFilters(false);
        }
      }
    }

    void carregarCategorias();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tipoVenda !== 'FEIRA') {
      setIdFeira('');
      return;
    }

    if (feiras.length > 0) {
      return;
    }

    let active = true;

    async function carregarFeiras() {
      setIsLoadingFeiras(true);

      try {
        const feirasResponse = await listFairs();

        if (active) {
          setFeiras(feirasResponse);
        }
      } catch (error) {
        if (active) {
          setProblem(getProblemDetailsFromError(error));
        }
      } finally {
        if (active) {
          setIsLoadingFeiras(false);
        }
      }
    }

    void carregarFeiras();

    return () => {
      active = false;
    };
  }, [feiras.length, tipoVenda]);

  const getCurrentFilters = (): AppliedFilters => ({
    dataInicio: dateRange.startValue,
    dataFim: dateRange.endValue,
    tipoVenda,
    idFeira,
    categoriasSelecionadas,
  });

  const buscarRelatorio = async (
    pagina = 1,
    tamanhoPagina = result?.tamanhoPagina ?? TAMANHO_PAGINA_INICIAL,
    filters = getCurrentFilters(),
  ) => {
    setProblem(null);
    setLocalError(null);

    if (!filters.dataInicio || !filters.dataFim) {
      setLocalError('Selecione as datas inicial e final.');
      setResult(null);
      setAppliedFilters(null);
      return;
    }

    setIsLoading(true);

    try {
      const response = await getBestSellingProducts({
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
        tipoVenda:
          filters.tipoVenda === 'TODOS' ? undefined : filters.tipoVenda,
        idFeira:
          filters.tipoVenda === 'FEIRA' && filters.idFeira !== ''
            ? filters.idFeira
            : undefined,
        idsCategorias:
          filters.categoriasSelecionadas.length > 0
            ? filters.categoriasSelecionadas.map((categoria) => categoria.id)
            : undefined,
        pagina,
        tamanhoPagina,
      });

      setResult(response);
      setAppliedFilters(filters);
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
      setResult(null);
      setAppliedFilters(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setTipoVenda('TODOS');
    setIdFeira('');
    setCategoriasSelecionadas([]);
    setProblem(null);
    setLocalError(null);
    setResult(null);
    setAppliedFilters(null);
  };

  const periodoLabel = getPeriodoLabel(result);
  const visibleFilters = appliedFilters ?? getCurrentFilters();

  const renderProductCard = (item: BestSellingProductItem, index: number) => (
    <Box
      key={getProductRowKey(item, index, result?.pagina ?? 1)}
      sx={{ px: 2, py: 2 }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {item.nomeProduto}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Codigo: {item.codigo ?? '-'} ·{' '}
              {item.categoria?.nome ?? 'Sem categoria'}
            </Typography>
          </Box>

          <Chip
            label={`${item.quantidadeVendida} un`}
            color="primary"
            size="small"
          />
        </Stack>
      </Stack>
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Produtos mais vendidos
        </Typography>
        <Typography color="text.secondary">
          Identifique os produtos com maior giro por período, tipo de venda,
          feira e categorias.
        </Typography>
      </Box>

      <SearchFilterPanel
        onSearch={() => {
          void buscarRelatorio(1);
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
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
            label="Tipo de venda"
            value={tipoVenda}
            onChange={(event) =>
              setTipoVenda(event.target.value as 'TODOS' | TipoVenda)
            }
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="FEIRA">Feira</MenuItem>
            <MenuItem value="LOJA">Loja</MenuItem>
            <MenuItem value="ONLINE">Online</MenuItem>
            <MenuItem value="CONSIGNACAO">Consignação</MenuItem>
          </TextField>
        </Grid>

        {tipoVenda === 'FEIRA' ? (
          <Grid size={{ xs: 12, md: 6, lg: 5 }}>
            <TextField
              select
              fullWidth
              disabled={isLoadingFeiras}
              label="Feira"
              value={idFeira}
              onChange={(event) =>
                setIdFeira(
                  event.target.value === '' ? '' : Number(event.target.value),
                )
              }
              helperText={
                feiras.length === 0 && !isLoadingFeiras
                  ? 'Nenhuma feira cadastrada.'
                  : 'Opcional. Filtre uma feira específica.'
              }
            >
              <MenuItem value="">Todas as feiras</MenuItem>
              {feiras.map((feira) => (
                <MenuItem key={feira.id} value={feira.id}>
                  {feira.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, md: 6, lg: tipoVenda === 'FEIRA' ? 5 : 10 }}>
          <Autocomplete
            multiple
            options={categorias}
            value={categoriasSelecionadas}
            loading={isLoadingFilters}
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
      </SearchFilterPanel>

      <FormFeedbackAlert message={localError ?? problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          {periodoLabel ? <Alert severity="info">{periodoLabel}</Alert> : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Tipo: ${getSaleTypeLabel(visibleFilters.tipoVenda)}`}
              size="small"
            />
            <Chip
              label={`Categorias: ${visibleFilters.categoriasSelecionadas.length}`}
              size="small"
            />
            {visibleFilters.tipoVenda === 'FEIRA' &&
            visibleFilters.idFeira !== '' ? (
              <Chip
                label={`Feira: ${feiras.find((feira) => feira.id === visibleFilters.idFeira)?.nome ?? visibleFilters.idFeira}`}
                size="small"
              />
            ) : null}
          </Stack>

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {isMobile ? (
              <Stack divider={<Divider flexItem />}>
                {result.itens.length > 0 ? (
                  result.itens.map(renderProductCard)
                ) : (
                  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                    Nenhum produto encontrado para os filtros informados.
                  </Box>
                )}
              </Stack>
            ) : (
              <TableContainer>
                <Table aria-label="ranking de produtos mais vendidos">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Codigo</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Produto</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Categoria</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Quantidade vendida</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.itens.length > 0 ? (
                      result.itens.map((item, index) => (
                        <TableRow
                          key={getProductRowKey(item, index, result.pagina)}
                        >
                          <TableCell>{item.codigo ?? '-'}</TableCell>
                          <TableCell>{item.nomeProduto}</TableCell>
                          <TableCell>{item.categoria?.nome ?? '-'}</TableCell>
                          <TableCell align="right">
                            {item.quantidadeVendida}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                          Nenhum produto encontrado para os filtros informados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <TablePagination
              component="div"
              count={result.totalItens}
              page={Math.max(0, result.pagina - 1)}
              onPageChange={(_event, newPage) => {
                if (appliedFilters) {
                  void buscarRelatorio(
                    newPage + 1,
                    result.tamanhoPagina,
                    appliedFilters,
                  );
                }
              }}
              rowsPerPage={result.tamanhoPagina}
              onRowsPerPageChange={(event) => {
                if (appliedFilters) {
                  void buscarRelatorio(
                    1,
                    Number(event.target.value),
                    appliedFilters,
                  );
                }
              }}
              rowsPerPageOptions={[10, 25, 50]}
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
      ) : null}
    </Stack>
  );
}
