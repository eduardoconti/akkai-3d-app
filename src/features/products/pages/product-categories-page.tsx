import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { AddCircleOutline, Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import EditCategoryDialog from '../components/edit-category-dialog';
import NewCategoryDialog from '../components/new-category-dialog';
import { useProductStore } from '../store/use-product-store';
import type { Categoria } from '@/shared';

function getParentCategoryName(category: Categoria, categories: Categoria[]) {
  if (!category.idAscendente) {
    return '-';
  }

  return categories.find((item) => item.id === category.idAscendente)?.nome ?? '-';
}

export default function ProductCategoriesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    categorias,
    categoriasPaginadas,
    fetchCategorias,
    fetchCategoriasPaginadas,
    fetchErrorMessage,
    isFetchingCategoriesPage,
    paginacaoCategorias,
    totalCategorias,
  } = useProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = () => {
    void fetchCategoriasPaginadas({ pagina: 1, termo: searchInput.trim() });
  };

  useEffect(() => {
    void fetchCategorias();
  }, [fetchCategorias]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCategoriasPaginadas({ pagina: 1, termo: searchInput.trim() });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [fetchCategoriasPaginadas, searchInput]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Categorias
          </Typography>
          <Typography color="text.secondary">
            Consulte as categorias de produtos cadastradas e a hierarquia entre elas.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Nova categoria
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Pesquisar categoria"
          placeholder="Nome da categoria"
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
          <Stack divider={<Divider flexItem />} aria-label="lista de categorias">
            {isFetchingCategoriesPage ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : categoriasPaginadas.length > 0 ? (
              categoriasPaginadas.map((category) => (
                <Box
                  key={category.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingCategoryId(category.id)}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {category.nome}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Categoria superior: {getParentCategoryName(category, categorias)}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma categoria encontrada para a pesquisa informada.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de categorias">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Categoria Superior</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetchingCategoriesPage ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : categoriasPaginadas.length > 0 ? (
                  categoriasPaginadas.map((category) => (
                    <TableRow
                      key={category.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingCategoryId(category.id)}
                    >
                      <TableCell>{category.nome}</TableCell>
                      <TableCell>
                        {getParentCategoryName(category, categorias)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                      Nenhuma categoria encontrada para a pesquisa informada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalCategorias}
          page={Math.max(0, paginacaoCategorias.pagina - 1)}
          onPageChange={(_event, newPage) => {
            void fetchCategoriasPaginadas({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacaoCategorias.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchCategoriasPaginadas({
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

      <NewCategoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <EditCategoryDialog
        open={editingCategoryId !== null}
        categoryId={editingCategoryId}
        onClose={() => setEditingCategoryId(null)}
        onUpdated={async () => {
          await fetchCategorias();
          await fetchCategoriasPaginadas();
        }}
      />
    </Stack>
  );
}
