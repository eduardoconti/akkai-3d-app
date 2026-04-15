import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
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
import { AddCircleOutline, Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import EditProductDialog from '../components/edit-product-dialog';
import NewProductDialog from '../components/new-product-dialog';
import {
  productStoreSelectors,
  useProductStore,
} from '../store/use-product-store';
import {
  formatCurrency,
  type Categoria,
  type DirecaoOrdenacao,
  type OrdenacaoProduto,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    Categoria[]
  >([]);

  const handleSearch = () => {
    void fetchProdutos({
      pagina: 1,
      termo: searchInput.trim(),
      idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
    });
  };

  useEffect(() => {
    void fetchCategorias();
  }, [fetchCategorias]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchProdutos({
        pagina: 1,
        termo: searchInput.trim(),
        idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
      });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [categoriasSelecionadas, fetchProdutos, searchInput]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Produtos
          </Typography>
          <Typography color="text.secondary">
            Consulte nome, código, categoria, descrição e valor dos produtos
            cadastrados.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Novo produto
        </Button>
      </Stack>

      <Grid container spacing={2} columns={{ xs: 12, md: 12, lg: 20 }}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={paginacao.ordenarPor ?? 'codigo'}
            onChange={(event) => {
              void fetchProdutos({
                pagina: 1,
                ordenarPor: event.target.value as OrdenacaoProduto,
              });
            }}
          >
            <MenuItem value="codigo">Código</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="estoqueMinimo">Estoque mínimo</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={paginacao.direcao ?? 'desc'}
            onChange={(event) => {
              void fetchProdutos({
                pagina: 1,
                direcao: event.target.value as DirecaoOrdenacao,
              });
            }}
          >
            <MenuItem value="asc">Crescente</MenuItem>
            <MenuItem value="desc">Decrescente</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
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

        <Grid
          size={{ xs: 12, md: 6, lg: 3 }}
          sx={{ display: 'flex', alignItems: 'flex-start' }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{ height: 56 }}
          >
            Pesquisar
          </Button>
        </Grid>
      </Grid>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de produtos">
            {isFetchingProducts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
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
                        </Box>
                      </Stack>

                      <Stack spacing={0.75}>
                        <Typography variant="body2" color="text.secondary">
                          Categoria: {produto.categoria?.nome ?? '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Descrição: {produto.descricao || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Estoque mínimo: {produto.estoqueMinimo ?? '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Valor: {formatCurrency(produto.valor)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhum produto encontrado para a pesquisa informada.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 860 }} aria-label="tabela de produtos">
              <TableHead>
                <TableRow>
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
                    <strong>Estoque mínimo</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Valor</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isFetchingProducts ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
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
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {produto.codigo}
                        </TableCell>
                        <TableCell>{produto.nome}</TableCell>
                        <TableCell>{produto.categoria?.nome ?? '-'}</TableCell>
                        <TableCell>{produto.descricao || '-'}</TableCell>
                        <TableCell align="right">
                          {produto.estoqueMinimo ?? '-'}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(produto.valor)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      Nenhum produto encontrado para a pesquisa informada.
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
          page={Math.max(0, paginacao.pagina - 1)}
          onPageChange={(_event, newPage) => {
            void fetchProdutos({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacao.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchProdutos({
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

      <EditProductDialog
        open={editingProductId !== null}
        productId={editingProductId}
        onClose={() => setEditingProductId(null)}
        onUpdated={async () => {
          await fetchProdutos();
        }}
      />
      <NewProductDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
}
