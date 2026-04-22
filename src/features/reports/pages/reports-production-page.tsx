import { useEffect, useState } from 'react';
import {
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
import { Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  getProductionReport,
  type ProductionReportItem,
  type ProductionReportResponse,
} from '@/features/reports/api/reports-api';
import {
  DateRangePickerField,
  FormFeedbackAlert,
  formatCurrency,
  getMonthEndInput,
  getMonthStartInput,
  getProblemDetailsFromError,
  type ProblemDetails,
} from '@/shared';

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ReportsProductionPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dataInicio, setDataInicio] = useState(getMonthStartInput);
  const [dataFim, setDataFim] = useState(getMonthEndInput);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(10);
  const [ordenarPor, setOrdenarPor] = useState<
    'codigo' | 'nome' | 'quantidadeProduzida' | 'valorEstimado'
  >('quantidadeProduzida');
  const [direcao, setDirecao] = useState<'asc' | 'desc'>('desc');
  const [result, setResult] = useState<ProductionReportResponse | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    nextPage = pagina,
    nextPageSize = tamanhoPagina,
  ) => {
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
      const response = await getProductionReport({
        dataInicio,
        dataFim,
        pagina: nextPage,
        tamanhoPagina: nextPageSize,
        ordenarPor,
        direcao,
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void handleSubmit(1, tamanhoPagina);
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dataFim, dataInicio, direcao, ordenarPor, tamanhoPagina]);

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
              {formatCurrency(item.valorUnitario)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Valor estimado
            </Typography>
            <Typography fontWeight={700}>
              {formatCurrency(item.valorEstimado)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Media de pecas por dia
            </Typography>
            <Typography>{formatQuantity(item.mediaQuantidadePorDia)}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Media de valor por dia
            </Typography>
            <Typography>{formatCurrency(item.mediaValorPorDia)}</Typography>
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

      <Grid container spacing={2} columns={{ xs: 12, md: 12, lg: 20 }}>
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
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
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(
                event.target.value as
                  | 'codigo'
                  | 'nome'
                  | 'quantidadeProduzida'
                  | 'valorEstimado',
              )
            }
          >
            <MenuItem value="quantidadeProduzida">Quantidade produzida</MenuItem>
            <MenuItem value="valorEstimado">Valor estimado</MenuItem>
            <MenuItem value="codigo">Codigo</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={direcao}
            onChange={(event) =>
              setDirecao(event.target.value as 'asc' | 'desc')
            }
          >
            <MenuItem value="desc">Decrescente</MenuItem>
            <MenuItem value="asc">Crescente</MenuItem>
          </TextField>
        </Grid>

        <Grid
          size={{ xs: 12, md: 6, lg: 5 }}
          sx={{ display: 'flex', alignItems: 'flex-start' }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={isLoading ? <CircularProgress size={18} /> : <Search />}
            onClick={() => {
              void handleSubmit(1, tamanhoPagina);
            }}
            disabled={isLoading}
            sx={{ height: 56 }}
          >
            {isLoading ? 'Consultando...' : 'Pesquisar'}
          </Button>
        </Grid>
      </Grid>

      <FormFeedbackAlert message={localError ?? problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Periodo: ${result.diasNoPeriodo} dia(s)`} size="small" />
            <Chip
              label={`Pecas produzidas: ${formatQuantity(result.totalQuantidadeProduzida)}`}
              size="small"
            />
            <Chip
              label={`Valor estimado: ${formatCurrency(result.totalValorEstimado)}`}
              color="primary"
              size="small"
            />
            <Chip
              label={`Media de pecas/dia: ${formatQuantity(result.mediaQuantidadePorDia)}`}
              size="small"
            />
            <Chip
              label={`Media de valor/dia: ${formatCurrency(result.mediaValorPorDia)}`}
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
                            {formatCurrency(item.valorUnitario)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.valorEstimado)}
                          </TableCell>
                          <TableCell align="right">
                            {formatQuantity(item.mediaQuantidadePorDia)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.mediaValorPorDia)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          Nenhuma produção foi encontrada no período selecionado.
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
