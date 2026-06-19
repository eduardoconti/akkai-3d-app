import { useState } from 'react';
import {
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
  getProductionReport,
  type ProductionReportItem,
  type ProductionReportResponse,
} from '@/features/reports/api/reports-api';
import {
  CurrencyValue,
  DateRangePickerField,
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  PAGINATED_SEARCH_PAGE_SIZE_OPTIONS,
  SearchFilterPanel,
  formatCurrencyWithVisibility,
  getMonthRangeInput,
  getProblemDetailsFromError,
  useValueVisibilityStore,
  type ProblemDetails,
} from '@/shared';

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
}

type ProductionOrderBy =
  | 'codigo'
  | 'nome'
  | 'quantidadeProduzida'
  | 'valorEstimado';
type SortDirection = 'asc' | 'desc';

interface AppliedFilters {
  dataInicio: string;
  dataFim: string;
  ordenarPor: ProductionOrderBy;
  direcao: SortDirection;
}

export default function ReportsProductionPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const hideValues = useValueVisibilityStore((state) => state.hideValues);
  const [dateRange, setDateRange] = useState(getMonthRangeInput);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_PAGE_SIZE);
  const [ordenarPor, setOrdenarPor] = useState<ProductionOrderBy>(
    'quantidadeProduzida',
  );
  const [direcao, setDirecao] = useState<SortDirection>('desc');
  const [result, setResult] = useState<ProductionReportResponse | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null,
  );
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async (
    nextPage: number,
    nextPageSize: number,
    filters: AppliedFilters,
  ) => {
    setProblem(null);
    setLocalError(null);
    setIsLoading(true);

    try {
      const response = await getProductionReport({
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
        pagina: nextPage,
        tamanhoPagina: nextPageSize,
        ordenarPor: filters.ordenarPor,
        direcao: filters.direcao,
      });
      setTamanhoPagina(response.tamanhoPagina);
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

  const handleSubmit = async () => {
    setProblem(null);
    setLocalError(null);

    if (!dateRange.startValue || !dateRange.endValue) {
      setLocalError('Selecione as datas inicial e final.');
      setResult(null);
      setAppliedFilters(null);
      return;
    }

    await fetchReport(1, tamanhoPagina, {
      dataInicio: dateRange.startValue,
      dataFim: dateRange.endValue,
      ordenarPor,
      direcao,
    });
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setOrdenarPor('quantidadeProduzida');
    setDirecao('desc');
    setProblem(null);
    setLocalError(null);
    setResult(null);
    setAppliedFilters(null);
  };

  const renderCard = (item: ProductionReportItem) => (
    <Box key={item.codigo} sx={{ px: 2, py: 2 }}>
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {item.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Codigo: {item.codigo}
            </Typography>
          </Box>

          <Chip
            label={`${formatQuantity(item.quantidadeProduzida)} un`}
            size="small"
          />
        </Stack>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Valor unitario
            </Typography>
            <Typography fontWeight={600}>
              <CurrencyValue value={item.valorUnitario} />
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Valor estimado
            </Typography>
            <Typography fontWeight={700}>
              <CurrencyValue value={item.valorEstimado} />
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Media de pecas por dia
            </Typography>
            <Typography>
              {formatQuantity(item.mediaQuantidadePorDia)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Media de valor por dia
            </Typography>
            <Typography>
              <CurrencyValue value={item.mediaValorPorDia} />
            </Typography>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Relatorio de producao
        </Typography>
        <Typography color="text.secondary">
          Consulte as pecas produzidas no período, o valor estimado com base no
          valor atual dos produtos e as medias diarias de quantidade e valor.
        </Typography>
      </Box>

      <SearchFilterPanel
        onSearch={() => {
          void handleSubmit();
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as ProductionOrderBy)
            }
          >
            <MenuItem value="quantidadeProduzida">
              Quantidade produzida
            </MenuItem>
            <MenuItem value="valorEstimado">Valor estimado</MenuItem>
            <MenuItem value="codigo">Codigo</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={direcao}
            onChange={(event) =>
              setDirecao(event.target.value as SortDirection)
            }
          >
            <MenuItem value="desc">Decrescente</MenuItem>
            <MenuItem value="asc">Crescente</MenuItem>
          </TextField>
        </Grid>
      </SearchFilterPanel>

      <FormFeedbackAlert message={localError ?? problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Periodo: ${result.diasNoPeriodo} dia(s)`}
              size="small"
            />
            <Chip
              label={`Pecas produzidas: ${formatQuantity(result.totalQuantidadeProduzida)}`}
              size="small"
            />
            <Chip
              label={`Valor estimado: ${formatCurrencyWithVisibility(result.totalValorEstimado, hideValues)}`}
              color="primary"
              size="small"
            />
            <Chip
              label={`Media de pecas/dia: ${formatQuantity(result.mediaQuantidadePorDia)}`}
              size="small"
            />
            <Chip
              label={`Media de valor/dia: ${formatCurrencyWithVisibility(result.mediaValorPorDia, hideValues)}`}
              size="small"
            />
          </Stack>

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {isMobile ? (
              <Stack divider={<Divider flexItem />}>
                {result.itens.length > 0 ? (
                  result.itens.map(renderCard)
                ) : (
                  <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                    Nenhuma produção foi encontrada no período selecionado.
                  </Box>
                )}
              </Stack>
            ) : (
              <TableContainer>
                <Table aria-label="relatorio de producao">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Codigo</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Nome</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Quantidade</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Valor unitario</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Valor estimado</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Media pecas/dia</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Media valor/dia</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.itens.length > 0 ? (
                      result.itens.map((item) => (
                        <TableRow key={item.codigo}>
                          <TableCell>{item.codigo}</TableCell>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell align="right">
                            {formatQuantity(item.quantidadeProduzida)}
                          </TableCell>
                          <TableCell align="right">
                            <CurrencyValue value={item.valorUnitario} />
                          </TableCell>
                          <TableCell align="right">
                            <CurrencyValue value={item.valorEstimado} />
                          </TableCell>
                          <TableCell align="right">
                            {formatQuantity(item.mediaQuantidadePorDia)}
                          </TableCell>
                          <TableCell align="right">
                            <CurrencyValue value={item.mediaValorPorDia} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          Nenhuma produção foi encontrada no período
                          selecionado.
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
                  void fetchReport(
                    newPage + 1,
                    result.tamanhoPagina,
                    appliedFilters,
                  );
                }
              }}
              rowsPerPage={result.tamanhoPagina}
              onRowsPerPageChange={(event) => {
                if (appliedFilters) {
                  void fetchReport(
                    1,
                    Number(event.target.value),
                    appliedFilters,
                  );
                }
              }}
              rowsPerPageOptions={PAGINATED_SEARCH_PAGE_SIZE_OPTIONS}
              labelRowsPerPage="Itens por pagina"
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
