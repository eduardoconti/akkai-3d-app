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
  Typography,
  useMediaQuery,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import EditExpenseCategoryDialog from '../components/edit-expense-category-dialog';
import NewExpenseCategoryDialog from '../components/new-expense-category-dialog';

export default function FinanceExpenseCategoriesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { categoriasDespesa, fetchCategoriasDespesa, fetchErrorMessage, isFetching } =
    useFinanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    void fetchCategoriasDespesa();
  }, [fetchCategoriasDespesa]);

  const paginatedCategorias = categoriasDespesa.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(categoriasDespesa.length / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [categoriasDespesa.length, page, rowsPerPage]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Categorias de despesa
          </Typography>
          <Typography color="text.secondary">
            Gerencie as categorias usadas para classificar as despesas do negócio.
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

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de categorias de despesa">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : paginatedCategorias.length > 0 ? (
              paginatedCategorias.map((categoria) => (
                <Box
                  key={categoria.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingCategoryId(categoria.id)}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    {categoria.nome}
                  </Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma categoria cadastrada.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de categorias de despesa">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={1} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : paginatedCategorias.length > 0 ? (
                  paginatedCategorias.map((categoria) => (
                    <TableRow
                      key={categoria.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingCategoryId(categoria.id)}
                    >
                      <TableCell>{categoria.nome}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={1} align="center" sx={{ py: 6 }}>
                      Nenhuma categoria cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={categoriasDespesa.length}
          page={page}
          onPageChange={(_event, newPage) => {
            setPage(newPage);
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
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

      <NewExpenseCategoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
      <EditExpenseCategoryDialog
        open={editingCategoryId !== null}
        categoryId={editingCategoryId}
        onClose={() => setEditingCategoryId(null)}
        onUpdated={async () => {
          await fetchCategoriasDespesa();
        }}
      />
    </Stack>
  );
}
