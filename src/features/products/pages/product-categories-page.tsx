import { useEffect, useMemo, useState } from 'react';
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
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
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
  const { categorias, fetchCategorias, fetchErrorMessage, isFetchingCategories } =
    useProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  useEffect(() => {
    void fetchCategorias();
  }, [fetchCategorias]);

  const categories = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome)),
    [categorias],
  );

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

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de categorias">
            {isFetchingCategories ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : categories.length > 0 ? (
              categories.map((category) => (
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
                      Categoria superior: {getParentCategoryName(category, categories)}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma categoria cadastrada até o momento.
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
                {isFetchingCategories ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : categories.length > 0 ? (
                  categories.map((category) => (
                    <TableRow
                      key={category.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingCategoryId(category.id)}
                    >
                      <TableCell>{category.nome}</TableCell>
                      <TableCell>
                        {getParentCategoryName(category, categories)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 6 }}>
                      Nenhuma categoria cadastrada até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <NewCategoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <EditCategoryDialog
        open={editingCategoryId !== null}
        categoryId={editingCategoryId}
        onClose={() => setEditingCategoryId(null)}
        onUpdated={fetchCategorias}
      />
    </Stack>
  );
}
