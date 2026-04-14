import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
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
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search,
} from '@mui/icons-material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import StockMovementForm from '../components/stock-movement-form';
import { listStockMovements } from '../api/products-api';
import {
  productStoreSelectors,
  useProductStore,
} from '../store/use-product-store';
import type {
  DirecaoOrdenacao,
  EstoqueProduto,
  MovimentacaoEstoque,
  OrdenacaoProduto,
  PesquisaPaginada,
} from '@/shared';
import { getProblemDetailsFromError } from '@/shared';
import { useShallow } from 'zustand/react/shallow';

type StockState = {
  label: string;
  rowSx: Record<string, unknown>;
  chipColor: 'success' | 'warning' | 'error';
};

function getStockState(produto: EstoqueProduto): StockState {
  if (produto.quantidadeEstoque < 0) {
    return {
      label: 'Negativo',
      chipColor: 'error',
      rowSx: {
        backgroundColor: 'error.lighter',
        '&:hover': {
          backgroundColor: (theme: Theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : theme.palette.grey[50],
        },
      },
    };
  }

  if (
    produto.estoqueMinimo !== undefined &&
    produto.quantidadeEstoque < produto.estoqueMinimo
  ) {
    return {
      label: 'Abaixo do minimo',
      chipColor: 'warning',
      rowSx: {
        backgroundColor: 'warning.lighter',
        '&:hover': {
          backgroundColor: (theme: Theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : theme.palette.grey[50],
        },
      },
    };
  }

  return {
    label: 'Normal',
    chipColor: 'success',
    rowSx: {
      '&:hover': {
        backgroundColor: (theme: Theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.03)'
            : theme.palette.grey[50],
      },
    },
  };
}

function getMovementTypeLabel(tipo: 'E' | 'S') {
  return tipo === 'E' ? 'Entrada' : 'Saida';
}

function getMovementTypeColor(tipo: 'E' | 'S'): 'success' | 'error' {
  return tipo === 'E' ? 'success' : 'error';
}

function getMovementOriginLabel(origem: string) {
  switch (origem) {
    case 'COMPRA':
      return 'Compra';
    case 'VENDA':
      return 'Venda';
    case 'AJUSTE':
      return 'Ajuste';
    case 'PERDA':
      return 'Perda';
    case 'PRODUCAO':
      return 'Producao';
    default:
      return origem;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function formatMovementDateMobile(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMovementUserMobile(usuario: string) {
  return usuario.trim().slice(0, 2).toUpperCase() || '--';
}

interface StockExpansionProps {
  produto: EstoqueProduto;
  isMobile?: boolean;
}

function StockExpansion({ produto, isMobile = false }: StockExpansionProps) {
  const atualizarQuantidadeEstoqueLocal = useProductStore(
    productStoreSelectors.atualizarQuantidadeEstoqueLocal,
  );
  const [isFetchingMovements, setIsFetchingMovements] = useState(false);
  const [movementsErrorMessage, setMovementsErrorMessage] = useState<string | null>(
    null,
  );
  const [movements, setMovements] = useState<MovimentacaoEstoque[]>([]);
  const [pagination, setPagination] = useState<PesquisaPaginada>({
    pagina: 1,
    tamanhoPagina: 10,
  });
  const [totalItems, setTotalItems] = useState(0);

  const fetchMovements = useCallback(async (query?: Partial<PesquisaPaginada>) => {
    setIsFetchingMovements(true);
    setMovementsErrorMessage(null);

    const nextPagination: PesquisaPaginada = {
      pagina: query?.pagina ?? pagination.pagina,
      tamanhoPagina: query?.tamanhoPagina ?? pagination.tamanhoPagina,
    };

    try {
      const response = await listStockMovements(produto.id, nextPagination);
      setMovements(response.itens);
      setPagination({
        pagina: response.pagina,
        tamanhoPagina: response.tamanhoPagina,
      });
      setTotalItems(response.totalItens);
    } catch (error) {
      setMovementsErrorMessage(getProblemDetailsFromError(error).detail);
    } finally {
      setIsFetchingMovements(false);
    }
  }, [pagination.pagina, pagination.tamanhoPagina, produto.id]);

  const handleSavedMovement = async (delta: number) => {
    atualizarQuantidadeEstoqueLocal(produto.id, delta);
    await fetchMovements({ pagina: 1 });
  };

  useEffect(() => {
    void fetchMovements({ pagina: 1, tamanhoPagina: 10 });
  }, [fetchMovements]);

  return (
    <Box
      sx={{
        m: isMobile ? 0 : 2,
        mt: isMobile ? 2 : 2,
        p: isMobile ? 0 : 1,
      }}
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: 'background.paper',
              p: 2.5,
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 8px 20px rgba(0,0,0,0.2)'
                  : '0 10px 24px rgba(15, 23, 42, 0.06)',
            }}
          >
            <StockMovementForm produto={produto} onSaved={handleSavedMovement} />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack
            spacing={2}
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.02)'
                  : 'grey.50',
              p: 2.5,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Historico de movimentacoes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Movimentacoes mais recentes primeiro para {produto.nome}.
              </Typography>
            </Box>

            {movementsErrorMessage ? (
              <Alert severity="error">{movementsErrorMessage}</Alert>
            ) : null}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Usuario</TableCell>
                  {!isMobile ? <TableCell>Movimentacao</TableCell> : null}
                  <TableCell>Origem</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetchingMovements ? (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 4 : 5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : movements.length > 0 ? (
                  movements.map((movimentacao) => (
                    <TableRow
                      key={movimentacao.id}
                      sx={
                        isMobile
                          ? {
                              backgroundColor: (theme) =>
                                movimentacao.tipo === 'E'
                                  ? alpha(theme.palette.success.main, 0.12)
                                  : alpha(theme.palette.error.main, 0.12),
                            }
                          : undefined
                      }
                    >
                      <TableCell sx={isMobile ? { whiteSpace: 'nowrap', px: 1 } : undefined}>
                        {isMobile
                          ? formatMovementDateMobile(movimentacao.dataInclusao)
                          : formatDateTime(movimentacao.dataInclusao)}
                      </TableCell>
                      <TableCell sx={isMobile ? { whiteSpace: 'nowrap', px: 1 } : undefined}>
                        {isMobile
                          ? formatMovementUserMobile(movimentacao.usuario)
                          : movimentacao.usuario}
                      </TableCell>
                      {!isMobile ? (
                        <TableCell>
                          <Chip
                            label={getMovementTypeLabel(movimentacao.tipo)}
                            size="small"
                            color={getMovementTypeColor(movimentacao.tipo)}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell
                        sx={
                          isMobile
                            ? {
                                maxWidth: 84,
                                px: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }
                            : undefined
                        }
                      >
                        {getMovementOriginLabel(movimentacao.origem)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={isMobile ? { whiteSpace: 'nowrap', px: 1, fontWeight: 700 } : undefined}
                      >
                        {movimentacao.quantidade}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 4 : 5} align="center" sx={{ py: 4 }}>
                      Nenhuma movimentacao encontrada para este produto.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={totalItems}
              page={Math.max(0, pagination.pagina - 1)}
              onPageChange={(_event, newPage) => {
                void fetchMovements({ pagina: newPage + 1 });
              }}
              rowsPerPage={pagination.tamanhoPagina}
              onRowsPerPageChange={(event) => {
                void fetchMovements({
                  pagina: 1,
                  tamanhoPagina: Number(event.target.value),
                });
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
                  px: { xs: 1, sm: 0 },
                },
              }}
            />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

interface StockRowProps {
  produto: EstoqueProduto;
}

function StockRow({ produto }: StockRowProps) {
  const stockState = getStockState(produto);
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        onClick={() => setOpen((current) => !current)}
        sx={{
          '&:last-child td, &:last-child th': { border: 0 },
          cursor: 'pointer',
          ...stockState.rowSx,
        }}
      >
        <TableCell width={48}>
          <IconButton size="small">
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {produto.codigo}
        </TableCell>
        <TableCell>{produto.nome}</TableCell>
        <TableCell>{produto.categoria?.nome ?? '-'}</TableCell>
        <TableCell>{produto.descricao || '-'}</TableCell>
        <TableCell align="right">{produto.quantidadeEstoque}</TableCell>
        <TableCell align="right">{produto.estoqueMinimo ?? '-'}</TableCell>
        <TableCell align="center">
          <Chip
            label={stockState.label}
            size="small"
            color={stockState.chipColor}
            variant="filled"
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <StockExpansion produto={produto} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function MobileStockCard({ produto }: { produto: EstoqueProduto }) {
  const stockState = getStockState(produto);
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ px: 2, py: 2, ...stockState.rowSx }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {produto.codigo}
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {produto.nome}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={stockState.label}
              size="small"
              color={stockState.chipColor}
              variant="filled"
            />
            <IconButton size="small" onClick={() => setOpen((current) => !current)}>
              {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </Stack>
        </Stack>

        <Stack spacing={0.75}>
          <Typography variant="body2" color="text.secondary">
            Categoria: {produto.categoria?.nome ?? '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Descrição: {produto.descricao || '-'}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Quantidade
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {produto.quantidadeEstoque}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Estoque minimo
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {produto.estoqueMinimo ?? '-'}
            </Typography>
          </Box>
        </Stack>

        <Collapse in={open} timeout="auto" unmountOnExit>
          <StockExpansion produto={produto} isMobile />
        </Collapse>
      </Stack>
    </Box>
  );
}

export default function ProductsStockPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    estoqueProdutos,
    fetchErrorMessage,
    fetchEstoque,
    isFetchingStock,
    paginacaoEstoque,
    totalItensEstoque,
  } = useProductStore(
    useShallow((state) => ({
      estoqueProdutos: productStoreSelectors.estoqueProdutos(state),
      fetchErrorMessage: productStoreSelectors.fetchErrorMessage(state),
      fetchEstoque: productStoreSelectors.fetchEstoque(state),
      isFetchingStock: productStoreSelectors.isFetchingStock(state),
      paginacaoEstoque: productStoreSelectors.paginacaoEstoque(state),
      totalItensEstoque: productStoreSelectors.totalItensEstoque(state),
    })),
  );
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = () => {
    void fetchEstoque({ pagina: 1, termo: searchInput.trim() });
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchEstoque({ pagina: 1, termo: searchInput.trim() });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [fetchEstoque, searchInput]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Estoque
        </Typography>
        <Typography color="text.secondary">
          Consulte o saldo, registre movimentacoes e acompanhe o historico por
          produto.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          select
          label="Ordenar por"
          value={paginacaoEstoque.ordenarPor ?? 'nivelEstoque'}
          onChange={(event) => {
            void fetchEstoque({
              pagina: 1,
              ordenarPor: event.target.value as OrdenacaoProduto,
            });
          }}
          sx={{ minWidth: { xs: '100%', md: 180 } }}
        >
          <MenuItem value="codigo">Código</MenuItem>
          <MenuItem value="nome">Nome</MenuItem>
          <MenuItem value="quantidade">Quantidade</MenuItem>
          <MenuItem value="nivelEstoque">Nível do estoque</MenuItem>
        </TextField>

        <TextField
          select
          label="Direção"
          value={paginacaoEstoque.direcao ?? 'asc'}
          onChange={(event) => {
            void fetchEstoque({
              pagina: 1,
              direcao: event.target.value as DirecaoOrdenacao,
            });
          }}
          sx={{ minWidth: { xs: '100%', md: 160 } }}
        >
          <MenuItem value="asc">Crescente</MenuItem>
          <MenuItem value="desc">Decrescente</MenuItem>
        </TextField>

        <TextField
          label="Pesquisar estoque"
          placeholder="Nome, código ou categoria"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ minWidth: { xs: '100%', md: 320 } }}
        />

        <Button variant="outlined" startIcon={<Search />} onClick={handleSearch}>
          Pesquisar
        </Button>
      </Stack>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de estoque">
            {isFetchingStock ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : estoqueProdutos.length > 0 ? (
              estoqueProdutos.map((produto) => (
                <MobileStockCard key={produto.id} produto={produto} />
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhum item de estoque encontrado para a pesquisa informada.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 760 }} aria-label="tabela de estoque">
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>
                    <strong>Código</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Categoria</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Quantidade</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Estoque mínimo</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Estoque atual</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isFetchingStock ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : estoqueProdutos.length > 0 ? (
                  estoqueProdutos.map((produto) => (
                    <StockRow key={produto.id} produto={produto} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      Nenhum item de estoque encontrado para a pesquisa informada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalItensEstoque}
          page={Math.max(0, paginacaoEstoque.pagina - 1)}
          onPageChange={(_event, newPage) => {
            void fetchEstoque({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacaoEstoque.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchEstoque({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
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
  );
}
