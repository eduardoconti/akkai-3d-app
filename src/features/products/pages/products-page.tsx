import { useEffect, useState, type MouseEvent } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
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
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Inventory2 } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import EditProductDialog from '../components/edit-product-dialog';
import StockManagementDialog from '../components/stock-management-dialog';
import {
  productStoreSelectors,
  useProductStore,
} from '../store/use-product-store';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  AppTablePagination,
  CurrencyValue,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchFilterPanel,
  TableColumnVisibilityButton,
  type Categoria,
  type DirecaoOrdenacao,
  type OrdenacaoProduto,
  type Produto,
  useTableColumnVisibility,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

type ProductTableColumnId =
  | 'codigo'
  | 'nome'
  | 'status'
  | 'categoria'
  | 'descricao'
  | 'estoque'
  | 'valor'
  | 'acoes';

const PRODUCT_TABLE_COLUMNS = [
  { id: 'codigo', label: 'Código', required: true },
  { id: 'nome', label: 'Nome', required: true },
  { id: 'status', label: 'Status' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'descricao', label: 'Descrição' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'valor', label: 'Valor' },
  { id: 'acoes', label: 'Ações', required: true },
] as const;

function getStockQuantity(produto: Produto): number {
  return produto.quantidadeEstoque ?? 0;
}

function isOutOfStock(produto: Produto): boolean {
  return getStockQuantity(produto) <= 0;
}

function isLowStock(produto: Produto): boolean {
  const quantidadeEstoque = getStockQuantity(produto);
  return (
    quantidadeEstoque > 0 &&
    produto.estoqueMinimo !== undefined &&
    quantidadeEstoque < produto.estoqueMinimo
  );
}

function getStockColor(produto: Produto): 'error' | 'warning' | 'default' {
  if (isOutOfStock(produto)) {
    return 'error';
  }

  if (isLowStock(produto)) {
    return 'warning';
  }

  return 'default';
}

function getStockVariant(produto: Produto): 'filled' | 'outlined' {
  return isOutOfStock(produto) || isLowStock(produto) ? 'filled' : 'outlined';
}

function getStatusProductLabel(produto: Produto): string {
  return produto.status === 'ATIVO' ? 'Ativo' : 'Inativo';
}

function getStatusProductColor(produto: Produto): 'success' | 'default' {
  return produto.status === 'ATIVO' ? 'success' : 'default';
}

export default function ProductsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    categorias,
    fetchCategorias,
    fetchErrorMessage,
    fetchProdutos,
    isFetchingProducts,
    paginacao,
    produtos,
    totalItens,
  } = useProductStore(
    useShallow((state) => ({
      categorias: productStoreSelectors.categorias(state),
      fetchCategorias: productStoreSelectors.fetchCategorias(state),
      fetchErrorMessage: productStoreSelectors.fetchErrorMessage(state),
      fetchProdutos: productStoreSelectors.fetchProdutos(state),
      isFetchingProducts: productStoreSelectors.isFetchingProducts(state),
      paginacao: productStoreSelectors.paginacao(state),
      produtos: productStoreSelectors.produtos(state),
      totalItens: productStoreSelectors.totalItens(state),
    })),
  );
  const [searchInput, setSearchInput] = useState(paginacao.termo ?? '');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [stockProduct, setStockProduct] = useState<Produto | null>(null);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    Categoria[]
  >([]);
  const [ordenarPor, setOrdenarPor] = useState<OrdenacaoProduto>(
    paginacao.ordenarPor ?? 'codigo',
  );
  const [direcao, setDirecao] = useState<DirecaoOrdenacao>(
    paginacao.direcao ?? 'desc',
  );
  const {
    visibleColumnIds,
    isColumnVisible,
    toggleColumnVisibility,
    resetColumnVisibility,
  } = useTableColumnVisibility<ProductTableColumnId>(
    'akkai:products-page:produtos:columns',
    PRODUCT_TABLE_COLUMNS,
  );
  const { openNewProductDialog } = useMainLayoutActions();

  const handleSearch = () => {
    void fetchProdutos({
      pagina: 1,
      termo: searchInput.trim(),
      idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
      ordenarPor,
      direcao,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setCategoriasSelecionadas([]);
    setOrdenarPor('codigo');
    setDirecao('desc');
    void fetchProdutos({
      pagina: 1,
      termo: '',
      idsCategorias: [],
      ordenarPor: 'codigo',
      direcao: 'desc',
    });
  };

  useEffect(() => {
    void fetchCategorias();
    void fetchProdutos();
  }, [fetchCategorias, fetchProdutos]);

  useEffect(() => {
    const idsCategoriasSelecionadas = paginacao.idsCategorias ?? [];
    setCategoriasSelecionadas(
      categorias.filter((categoria) =>
        idsCategoriasSelecionadas.includes(categoria.id),
      ),
    );
  }, [categorias, paginacao.idsCategorias]);

  const openStockDialog = (
    event: MouseEvent<HTMLButtonElement>,
    produto: Produto,
  ) => {
    event.stopPropagation();
    setStockProduct(produto);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Produtos"
        description="Consulte nome, código, categoria, descrição e valor dos produtos cadastrados."
        actionLabel="Novo produto"
        onAction={openNewProductDialog}
      />

      <SearchFilterPanel onSearch={handleSearch} onClear={handleClearFilters}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as OrdenacaoProduto)
            }
          >
            <MenuItem value="codigo">Código</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="nivelEstoque">Nível estoque</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={direcao}
            onChange={(event) =>
              setDirecao(event.target.value as DirecaoOrdenacao)
            }
          >
            <MenuItem value="asc">Crescente</MenuItem>
            <MenuItem value="desc">Decrescente</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <Autocomplete
            multiple
            options={categorias}
            value={categoriasSelecionadas}
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

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <TextField
            fullWidth
            label="Pesquisar produto"
            placeholder="Nome, código ou categoria"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de produtos">
            {isFetchingProducts ? (
              <LoadingState />
            ) : produtos.length > 0 ? (
              produtos.map((produto) => {
                return (
                  <Box
                    key={produto.id}
                    onClick={() => setEditingProductId(produto.id)}
                    sx={{
                      cursor: 'pointer',
                      px: 2,
                      py: 2,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
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
                          <Chip
                            label={getStatusProductLabel(produto)}
                            size="small"
                            color={getStatusProductColor(produto)}
                            variant={
                              produto.status === 'ATIVO'
                                ? 'filled'
                                : 'outlined'
                            }
                            sx={{ mt: 0.75 }}
                          />
                        </Box>

                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          startIcon={<Inventory2 fontSize="small" />}
                          onClick={(event) => openStockDialog(event, produto)}
                        >
                          Movimentar
                        </Button>
                      </Stack>

                      <Stack spacing={0.75}>
                        <Typography variant="body2" color="text.secondary">
                          Categoria: {produto.categoria?.nome ?? '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Descrição: {produto.descricao || '-'}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Typography variant="body2" color="text.secondary">
                            Estoque atual:
                          </Typography>
                          <Chip
                            label={getStockQuantity(produto)}
                            size="medium"
                            color={getStockColor(produto)}
                            variant={getStockVariant(produto)}
                            sx={{
                              minWidth: 44,
                              fontWeight: 700,
                              '& .MuiChip-label': { px: 1.5 },
                            }}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Valor: <CurrencyValue value={produto.valor} />
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })
            ) : (
              <EmptyState message="Nenhum produto encontrado para a pesquisa informada." />
            )}
          </Stack>
        ) : (
          <>
            <Stack
              direction="row"
              justifyContent="flex-end"
              sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
            >
              <TableColumnVisibilityButton
                columns={PRODUCT_TABLE_COLUMNS}
                visibleColumnIds={visibleColumnIds}
                onToggleColumn={toggleColumnVisibility}
                onResetColumns={resetColumnVisibility}
              />
            </Stack>

            <TableContainer>
              <Table sx={{ minWidth: 780 }} aria-label="tabela de produtos">
                <TableHead>
                  <TableRow>
                    {isColumnVisible('codigo') ? (
                      <TableCell>
                        <strong>Código</strong>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('nome') ? (
                      <TableCell>
                        <strong>Nome</strong>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('status') ? (
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('categoria') ? (
                      <TableCell>
                        <strong>Categoria</strong>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('descricao') ? (
                      <TableCell>
                        <strong>Descrição</strong>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('estoque') ? (
                      <TableCell align="center">
                        <strong>Estoque</strong>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('valor') ? (
                      <TableCell align="right">
                        <strong>Valor</strong>
                      </TableCell>
                    ) : null}
                    {isColumnVisible('acoes') ? (
                      <TableCell align="right">
                        <strong>Ações</strong>
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {isFetchingProducts ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumnIds.length} sx={{ p: 0 }}>
                        <LoadingState />
                      </TableCell>
                    </TableRow>
                  ) : produtos.length > 0 ? (
                    produtos.map((produto) => {
                      return (
                        <TableRow
                          key={produto.id}
                          onClick={() => setEditingProductId(produto.id)}
                          sx={{
                            '&:last-child td, &:last-child th': { border: 0 },
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
                          {isColumnVisible('codigo') ? (
                            <TableCell component="th" scope="row">
                              {produto.codigo}
                            </TableCell>
                          ) : null}
                          {isColumnVisible('nome') ? (
                            <TableCell>{produto.nome}</TableCell>
                          ) : null}
                          {isColumnVisible('status') ? (
                            <TableCell>
                              <Chip
                                label={getStatusProductLabel(produto)}
                                size="small"
                                color={getStatusProductColor(produto)}
                                variant={
                                  produto.status === 'ATIVO'
                                    ? 'filled'
                                    : 'outlined'
                                }
                              />
                            </TableCell>
                          ) : null}
                          {isColumnVisible('categoria') ? (
                            <TableCell>
                              {produto.categoria?.nome ?? '-'}
                            </TableCell>
                          ) : null}
                          {isColumnVisible('descricao') ? (
                            <TableCell>{produto.descricao || '-'}</TableCell>
                          ) : null}
                          {isColumnVisible('estoque') ? (
                            <TableCell align="center">
                              <Chip
                                label={getStockQuantity(produto)}
                                size="medium"
                                color={getStockColor(produto)}
                                variant={getStockVariant(produto)}
                                sx={{
                                  minWidth: 44,
                                  fontWeight: 700,
                                  '& .MuiChip-label': { px: 1.5 },
                                }}
                              />
                            </TableCell>
                          ) : null}
                          {isColumnVisible('valor') ? (
                            <TableCell align="right">
                              <CurrencyValue value={produto.valor} />
                            </TableCell>
                          ) : null}
                          {isColumnVisible('acoes') ? (
                            <TableCell align="right">
                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                startIcon={<Inventory2 fontSize="small" />}
                                onClick={(event) =>
                                  openStockDialog(event, produto)
                                }
                              >
                                Movimentar
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumnIds.length} sx={{ p: 0 }}>
                        <EmptyState message="Nenhum produto encontrado para a pesquisa informada." />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <AppTablePagination
          count={totalItens}
          page={Math.max(0, paginacao.pagina - 1)}
          rowsPerPage={paginacao.tamanhoPagina}
          onPageChange={(_event, newPage) => {
            void fetchProdutos({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchProdutos({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <EditProductDialog
        open={editingProductId !== null}
        productId={editingProductId}
        onClose={() => setEditingProductId(null)}
        onUpdated={async () => {
          await fetchProdutos();
        }}
      />
      <StockManagementDialog
        open={stockProduct !== null}
        produto={stockProduct}
        onClose={() => setStockProduct(null)}
        onUpdated={async () => {
          await fetchProdutos();
        }}
      />
    </Stack>
  );
}
