import { useEffect, useMemo, useState } from 'react';
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
import {
  getBestSellingProducts,
  type BestSellingProductItem,
  type BestSellingProductsResponse,
} from '@/features/reports/api/reports-api';
import { listAllCategories } from '@/features/products/api/products-api';
import { listFairs } from '@/features/sales/api/sales-api';
import {
  DateRangePickerField,
  FormFeedbackAlert,
  SearchFilterPanel,
  getProblemDetailsFromError,
  getMonthRangeInput,
  type Categoria,
  type Feira,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';
import { getSaleTypeLabel } from '@/features/sales/utils/format-sale-labels';

function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
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
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(10);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingFeiras, setIsLoadingFeiras] = useState(false);
  const [hasLoadedFeiras, setHasLoadedFeiras] = useState(false);

  useEffect(() => {
    let active = true;

    const loadFilters = async () => {
      setIsLoadingFilters(true);

      try {
        const categoriasResponse = await listAllCategories();

        if (!active) {
          return;
        }

        setCategorias(categoriasResponse);
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) {
          setIsLoadingFilters(false);
        }
      }
    };

    void loadFilters();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tipoVenda !== 'FEIRA') {
      setIdFeira('');
    }
  }, [tipoVenda]);

  useEffect(() => {
    if (tipoVenda !== 'FEIRA' || hasLoadedFeiras) {
      return;
    }

    let active = true;

    const loadFeiras = async () => {
      setIsLoadingFeiras(true);

      try {
        const feirasResponse = await listFairs();

        if (!active) {
          return;
        }

        setFeiras(feirasResponse);
        setHasLoadedFeiras(true);
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) {
          setIsLoadingFeiras(false);
        }
      }
    };

    void loadFeiras();

    return () => {
      active = false;
    };
  }, [hasLoadedFeiras, tipoVenda]);

  const periodoLabel = useMemo(() => {
    if (!result) {
      return null;
    }

    if (result.dataInicio === result.dataFim) {
      return `Período consultado: ${formatApiDateToDisplay(result.dataInicio)}`;
    }

    return `Período consultado: ${formatApiDateToDisplay(result.dataInicio)} até ${formatApiDateToDisplay(result.dataFim)}`;
  }, [result]);

  const handleSubmit = async (
    nextPage = pagina,
    nextPageSize = tamanhoPagina,
  ) => {
    setProblem(null);
    setLocalError(null);
    setIsLoading(true);

    if (!dateRange.startValue || !dateRange.endValue) {
      setLocalError('Selecione as datas inicial e final.');
      setResult(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await getBestSellingProducts({
        dataInicio: dateRange.startValue,
        dataFim: dateRange.endValue,
        tipoVenda: tipoVenda === 'TODOS' ? undefined : tipoVenda,
        idFeira: tipoVenda === 'FEIRA' && idFeira !== '' ? idFeira : undefined,
        idsCategorias:
          categoriasSelecionadas.length > 0
            ? categoriasSelecionadas.map((categoria) => categoria.id)
            : undefined,
        pagina: nextPage,
        tamanhoPagina: nextPageSize,
      });
      setPagina(response.pagina);
      setTamanhoPagina(response.tamanhoPagina);
      setResult(response);
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
      setResult(null);
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
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void handleSubmit(1, tamanhoPagina);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    categoriasSelecionadas,
    dateRange.endValue,
    dateRange.startValue,
    idFeira,
    tamanhoPagina,
    tipoVenda,
  ]);

  const renderProductCard = (item: BestSellingProductItem) => (
    <Box key={`${item.idProduto ?? item.nomeProduto}`} sx={{ px: 2, py: 2 }}>
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
          void handleSubmit(1, tamanhoPagina);
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
            <Chip label={`Tipo: ${getSaleTypeLabel(tipoVenda)}`} size="small" />
            <Chip
              label={`Categorias: ${categoriasSelecionadas.length}`}
              size="small"
            />
            {tipoVenda === 'FEIRA' && idFeira !== '' ? (
              <Chip
                label={`Feira: ${feiras.find((feira) => feira.id === idFeira)?.nome ?? idFeira}`}
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
                      result.itens.map((item) => (
                        <TableRow
                          key={`${item.idProduto ?? item.nomeProduto}-${item.categoria?.id ?? 'sem-categoria'}`}
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
                void handleSubmit(newPage + 1, tamanhoPagina);
              }}
              rowsPerPage={result.tamanhoPagina}
              onRowsPerPageChange={(event) => {
                void handleSubmit(1, Number(event.target.value));
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
