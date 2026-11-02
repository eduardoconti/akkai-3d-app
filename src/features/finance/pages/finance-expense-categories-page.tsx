import { useEffect, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import EditExpenseCategoryDialog from '../components/edit-expense-category-dialog';
import NewExpenseCategoryDialog from '../components/new-expense-category-dialog';
import {
  type CategoriaDespesa,
  DEFAULT_PAGE_SIZE,
  type DataTableColumn,
  PageHeader,
  ResponsiveDataTable,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

const colunasCategorias: DataTableColumn<CategoriaDespesa>[] = [
  { id: 'nome', header: 'Nome', mobile: 'title', cell: (c) => c.nome },
];

export default function FinanceExpenseCategoriesPage() {
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
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);

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

      <ResponsiveDataTable
        rows={paginatedCategorias}
        columns={colunasCategorias}
        getRowId={(categoria) => categoria.id}
        ariaLabel="tabela de categorias de despesa"
        emptyMessage="Nenhuma categoria cadastrada."
        isLoading={isFetching}
        onRowClick={(categoria) => setEditingCategoryId(categoria.id)}
        pagination={{
          count: categoriasDespesa.length,
          page,
          rowsPerPage,
          onPageChange: setPage,
          onRowsPerPageChange: (novoTamanho) => {
            setRowsPerPage(novoTamanho);
            setPage(0);
          },
        }}
      />

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
