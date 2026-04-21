import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
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
import { useTheme } from '@mui/material/styles';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import EditExpenseCategoryDialog from '../components/edit-expense-category-dialog';
import NewExpenseCategoryDialog from '../components/new-expense-category-dialog';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function FinanceExpenseCategoriesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    categoriasDespesa,
    fetchCategoriasDespesa,
    fetchErrorMessage,
    isFetching,
  } = useFinanceStore(
    useShallow((state) => ({
      categoriasDespesa: financeStoreSelectors.categoriasDespesa(state),
      fetchCategoriasDespesa:
        financeStoreSelectors.fetchCategoriasDespesa(state),
      fetchErrorMessage: financeStoreSelectors.fetchErrorMessage(state),
      isFetching: financeStoreSelectors.isFetching(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
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
    const maxPage = Math.max(
      0,
      Math.ceil(categoriasDespesa.length / rowsPerPage) - 1,
    );
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [categoriasDespesa.length, page, rowsPerPage]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Categorias de despesa"
        description="Gerencie as categorias usadas para classificar as despesas do negócio."
        actionLabel="Nova categoria"
        onAction={() => setDialogOpen(true)}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack
            divider={<Divider flexItem />}
            aria-label="lista de categorias de despesa"
          >
            {isFetching ? (
              <LoadingState />
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
              <EmptyState message="Nenhuma categoria cadastrada." />
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
                    <TableCell colSpan={1} sx={{ p: 0 }}>
                      <LoadingState />
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
                    <TableCell colSpan={1} sx={{ p: 0 }}>
                      <EmptyState message="Nenhuma categoria cadastrada." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={categoriasDespesa.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_event, newPage) => {
            setPage(newPage);
          }}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
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
