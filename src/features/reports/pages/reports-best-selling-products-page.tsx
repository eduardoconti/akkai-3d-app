import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { LocalFireDepartment } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  getBestSellingProducts,
  type BestSellingProductItem,
  type BestSellingProductsResponse,
} from '@/features/reports/api/reports-api';
import { listAllCategories } from '@/features/products/api/products-api';
import { listFairs } from '@/features/sales/api/sales-api';
import {
  DatePickerField,
  FormFeedbackAlert,
  getProblemDetailsFromError,
  type Categoria,
  type Feira,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';

function getCurrentDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function getSaleTypeLabel(tipoVenda: 'TODOS' | TipoVenda): string {
  switch (tipoVenda) {
    case 'FEIRA':
      return 'Feira';
    case 'LOJA':
      return 'Loja';
    case 'ONLINE':
      return 'Online';
    default:
      return 'Todos';
  }
}

const initialDate = getCurrentDateInput();

export default function ReportsBestSellingProductsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dataInicio, setDataInicio] = useState(initialDate);
  const [dataFim, setDataFim] = useState(initialDate);
  const [tipoVenda, setTipoVenda] = useState<'TODOS' | TipoVenda>('TODOS');
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    Categoria[]
  >([]);
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [result, setResult] = useState<BestSellingProductsResponse | null>(null);
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

  const handleSubmit = async (nextPage = pagina, nextPageSize = tamanhoPagina) => {
    setProblem(null);
    setLocalError(null);
    setIsLoading(true);

    if (!dataInicio || !dataFim) {
      setLocalError('Selecione as datas inicial e final.');
      setResult(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await getBestSellingProducts({
        dataInicio,
        dataFim,
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

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <DatePickerField
                label="Data inicial"
                value={dataInicio}
                onValueChange={setDataInicio}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <DatePickerField
                label="Data final"
                value={dataFim}
                onValueChange={setDataFim}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
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

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                disabled={tipoVenda !== 'FEIRA' || isLoadingFeiras}
                label="Feira"
                value={idFeira}
                onChange={(event) =>
                  setIdFeira(
                    event.target.value === '' ? '' : Number(event.target.value),
                  )
                }
                helperText={
                  tipoVenda === 'FEIRA'
                    ? feiras.length === 0 && !isLoadingFeiras
                      ? 'Nenhuma feira cadastrada.'
                      : 'Opcional. Filtre uma feira específica.'
                    : 'Disponível apenas para vendas do tipo feira.'
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

            <Grid size={{ xs: 12, md: 8 }}>
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

            <Grid
              size={{ xs: 12, md: 4 }}
              sx={{ display: 'flex', alignItems: 'stretch' }}
            >
              <Button
                fullWidth
                variant="contained"
                startIcon={
                  isLoading ? (
                    <CircularProgress size={18} />
                  ) : (
                    <LocalFireDepartment />
                  )
                }
                onClick={() => {
                  void handleSubmit(1, tamanhoPagina);
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Consultando...' : 'Consultar ranking'}
              </Button>
            </Grid>
          </Grid>

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
                              <TableCell>{item.nomeProduto}</TableCell>
                              <TableCell>{item.categoria?.nome ?? '-'}</TableCell>
                              <TableCell align="right">
                                {item.quantidadeVendida}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
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
      </Paper>
    </Stack>
  );
}
