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
  getProductionSuggestionReport,
  type ProductionSuggestionReportItem,
  type ProductionSuggestionReportResponse,
} from '@/features/reports/api/reports-api';
import {
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  PAGINATED_SEARCH_PAGE_SIZE_OPTIONS,
  SearchFilterPanel,
  getProblemDetailsFromError,
  type ProblemDetails,
} from '@/shared';

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCoverage(value: number | null): string {
  return value === null ? 'Sem venda' : `${formatQuantity(value)} dia(s)`;
}

type SuggestionOrderBy =
  | 'codigo'
  | 'nome'
  | 'estoqueAtual'
  | 'quantidadeVendida'
  | 'mediaVendaDiaria'
  | 'diasCobertura'
  | 'sugestaoProducao';
type SortDirection = 'asc' | 'desc';

interface AppliedFilters {
  diasHistorico: number;
  diasPlanejamento: number;
  diasEstoqueSeguranca: number;
  ordenarPor: SuggestionOrderBy;
  direcao: SortDirection;
}

export default function ReportsProductionSuggestionPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [diasHistorico, setDiasHistorico] = useState(28);
  const [diasPlanejamento, setDiasPlanejamento] = useState(7);
  const [diasEstoqueSeguranca, setDiasEstoqueSeguranca] = useState(2);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_PAGE_SIZE);
  const [ordenarPor, setOrdenarPor] =
    useState<SuggestionOrderBy>('sugestaoProducao');
  const [direcao, setDirecao] = useState<SortDirection>('desc');
  const [result, setResult] =
    useState<ProductionSuggestionReportResponse | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null,
  );
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async (
    nextPage: number,
    nextPageSize: number,
    filters: AppliedFilters,
  ) => {
    setProblem(null);
    setIsLoading(true);

    try {
      const response = await getProductionSuggestionReport({
        diasHistorico: filters.diasHistorico,
        diasPlanejamento: filters.diasPlanejamento,
        diasEstoqueSeguranca: filters.diasEstoqueSeguranca,
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

    await fetchReport(1, tamanhoPagina, {
      diasHistorico,
      diasPlanejamento,
      diasEstoqueSeguranca,
      ordenarPor,
      direcao,
    });
  };

  const handleClearFilters = () => {
    setDiasHistorico(28);
    setDiasPlanejamento(7);
    setDiasEstoqueSeguranca(2);
    setOrdenarPor('sugestaoProducao');
    setDirecao('desc');
    setProblem(null);
    setResult(null);
    setAppliedFilters(null);
  };

  const renderPriorityChip = (
    priority: ProductionSuggestionReportItem['prioridade'],
  ) => (
    <Chip
      label={priority === 'CRITICO' ? 'Crítico' : 'Produzir'}
      color={priority === 'CRITICO' ? 'error' : 'warning'}
      size="small"
      variant={priority === 'CRITICO' ? 'filled' : 'outlined'}
    />
  );

  const renderCard = (item: ProductionSuggestionReportItem) => (
    <Box key={item.idProduto} sx={{ px: 2, py: 2 }}>
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

          {renderPriorityChip(item.prioridade)}
        </Stack>

        <Chip
          label={`Produzir ${formatQuantity(item.sugestaoProducao)} un`}
          color="primary"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
        />

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Estoque atual
            </Typography>
            <Typography fontWeight={600}>
              {formatQuantity(item.estoqueAtual)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Vendido
            </Typography>
            <Typography fontWeight={600}>
              {formatQuantity(item.quantidadeVendida)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Cobertura
            </Typography>
            <Typography>{formatCoverage(item.diasCobertura)}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Alvo
            </Typography>
            <Typography>{formatQuantity(item.estoqueAlvo)}</Typography>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Sugestão de produção
        </Typography>
        <Typography color="text.secondary">
          Compare vendas recentes, estoque atual e estoque mínimo para decidir o
          que produzir na semana.
        </Typography>
      </Box>

      <SearchFilterPanel
        onSearch={() => {
          void handleSubmit();
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <TextField
            fullWidth
            label="Últimos dias"
            type="number"
            value={diasHistorico}
            slotProps={{
              htmlInput: { min: 1, max: 365 },
            }}
            onChange={(event) =>
              setDiasHistorico(Math.max(1, Number(event.target.value) || 1))
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <TextField
            fullWidth
            label="Dias planejamento"
            type="number"
            value={diasPlanejamento}
            slotProps={{
              htmlInput: { min: 1, max: 90 },
            }}
            onChange={(event) =>
              setDiasPlanejamento(Math.max(1, Number(event.target.value) || 1))
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <TextField
            fullWidth
            label="Dias segurança"
            type="number"
            value={diasEstoqueSeguranca}
            slotProps={{
              htmlInput: { min: 0, max: 30 },
            }}
            onChange={(event) =>
              setDiasEstoqueSeguranca(Math.max(0, Number(event.target.value)))
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as SuggestionOrderBy)
            }
          >
            <MenuItem value="sugestaoProducao">Sugestão</MenuItem>
            <MenuItem value="diasCobertura">Cobertura</MenuItem>
            <MenuItem value="quantidadeVendida">Quantidade vendida</MenuItem>
            <MenuItem value="mediaVendaDiaria">Média diária</MenuItem>
            <MenuItem value="estoqueAtual">Estoque atual</MenuItem>
            <MenuItem value="codigo">Codigo</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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

      <FormFeedbackAlert message={problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Produtos: ${result.totalItens}`} size="small" />
            <Chip
              label={`Produção sugerida: ${formatQuantity(result.totalQuantidadeSugerida)} un`}
              color="primary"
              size="small"
            />
            <Chip
              label={`Histórico: ${result.diasHistorico} dia(s)`}
              size="small"
            />
            <Chip
              label={`Planejamento: ${result.diasPlanejamento} dia(s)`}
              size="small"
            />
            <Chip
              label={`Segurança: ${result.diasEstoqueSeguranca} dia(s)`}
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
                    Nenhuma produção foi sugerida para o período selecionado.
                  </Box>
                )}
              </Stack>
            ) : (
              <TableContainer>
                <Table aria-label="sugestao de producao">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Codigo</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Produto</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Prioridade</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Estoque</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Vendido</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Média/dia</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Cobertura</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Alvo</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Sugestão</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.itens.length > 0 ? (
                      result.itens.map((item) => (
                        <TableRow key={item.idProduto}>
                          <TableCell>{item.codigo}</TableCell>
                          <TableCell>{item.nome}</TableCell>
                          <TableCell>
                            {renderPriorityChip(item.prioridade)}
                          </TableCell>
                          <TableCell align="right">
                            {formatQuantity(item.estoqueAtual)}
                          </TableCell>
                          <TableCell align="right">
                            {formatQuantity(item.quantidadeVendida)}
                          </TableCell>
                          <TableCell align="right">
                            {formatQuantity(item.mediaVendaDiaria)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCoverage(item.diasCobertura)}
                          </TableCell>
                          <TableCell align="right">
                            {formatQuantity(item.estoqueAlvo)}
                          </TableCell>
                          <TableCell align="right">
                            <strong>
                              {formatQuantity(item.sugestaoProducao)}
                            </strong>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                          Nenhuma produção foi sugerida para o período
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
