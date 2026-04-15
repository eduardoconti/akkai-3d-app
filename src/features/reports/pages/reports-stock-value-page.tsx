import { useEffect, useState } from 'react';
import {
  MenuItem,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  getStockValueReport,
  type StockValueProductItem,
  type StockValueReportResponse,
} from '@/features/reports/api/reports-api';
import {
  FormFeedbackAlert,
  formatCurrency,
  getProblemDetailsFromError,
  type ProblemDetails,
} from '@/shared';

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export default function ReportsStockValuePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [result, setResult] = useState<StockValueReportResponse | null>(null);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(10);
  const [ordenarPor, setOrdenarPor] = useState<
    'codigo' | 'nome' | 'quantidade' | 'valor' | 'valorTotal'
  >('codigo');
  const [direcao, setDirecao] = useState<'asc' | 'desc'>('asc');
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (nextPage = pagina, nextPageSize = tamanhoPagina) => {
    setProblem(null);
    setIsLoading(true);

    try {
      const response = await getStockValueReport({
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
  }, [direcao, ordenarPor, tamanhoPagina]);

  const renderProductCard = (item: StockValueProductItem) => (
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

          <Chip label={`${formatQuantity(item.quantidade)} un`} size="small" />
        </Stack>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Valor unitario
            </Typography>
            <Typography fontWeight={600}>{formatCurrency(item.valor)}</Typography>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Valor total
            </Typography>
            <Typography fontWeight={700}>
              {formatCurrency(item.valorTotal)}
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
          Valor dos produtos em estoque
        </Typography>
        <Typography color="text.secondary">
          Consulte o saldo positivo do estoque com valor unitario, valor total
          por item e totalizadores globais do relatorio.
        </Typography>
      </Box>

      <Grid container spacing={2} columns={{ xs: 12, md: 12, lg: 20 }}>
        <Grid size={{ xs: 12, md: 6, lg: 7 }}>
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
                  | 'quantidade'
                  | 'valor'
                  | 'valorTotal',
              )
            }
          >
            <MenuItem value="codigo">Codigo</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="quantidade">Quantidade</MenuItem>
            <MenuItem value="valor">Valor</MenuItem>
            <MenuItem value="valorTotal">Valor total</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 7 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={direcao}
            onChange={(event) => setDirecao(event.target.value as 'asc' | 'desc')}
          >
            <MenuItem value="asc">Crescente</MenuItem>
            <MenuItem value="desc">Decrescente</MenuItem>
          </TextField>
        </Grid>

        <Grid
          size={{ xs: 12, md: 6, lg: 6 }}
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

      <FormFeedbackAlert message={problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Produtos: ${result.totalItens}`} size="small" />
            <Chip
              label={`Quantidade total: ${formatQuantity(result.totalQuantidade)}`}
              size="small"
            />
            <Chip
              label={`Soma dos valores: ${formatCurrency(result.totalValor)}`}
              size="small"
            />
            <Chip
              label={`Valor total em estoque: ${formatCurrency(result.totalValorTotal)}`}
              color="primary"
              size="small"
            />
          </Stack>

          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              {isMobile ? (
                <Stack divider={<Divider flexItem />}>
                  {result.itens.length > 0 ? (
                    result.itens.map(renderProductCard)
                  ) : (
                    <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                      Nenhum produto com estoque positivo foi encontrado.
                    </Box>
                  )}
                </Stack>
              ) : (
                <TableContainer>
                  <Table aria-label="relatorio de valor dos produtos em estoque">
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
                          <strong>Valor</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Valor total</strong>
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
                              {formatQuantity(item.quantidade)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.valorTotal)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                            Nenhum produto com estoque positivo foi encontrado.
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
