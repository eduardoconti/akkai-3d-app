import { useEffect, useState } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import EditCategoryDialog from '../components/edit-category-dialog';
import {
  productStoreSelectors,
  useProductStore,
} from '../store/use-product-store';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  type Categoria,
  type DataTableColumn,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

function getParentCategoryName(category: Categoria, categories: Categoria[]) {
  if (!category.idAscendente) {
    return '-';
  }

  return (
    categories.find((item) => item.id === category.idAscendente)?.nome ?? '-'
  );
}

export default function ProductCategoriesPage() {
  const {
    categorias,
    categoriasPaginadas,
    fetchCategorias,
    fetchCategoriasPaginadas,
    fetchErrorMessage,
    isFetchingCategoriesPage,
    paginacaoCategorias,
    totalCategorias,
  } = useProductStore(
    useShallow((state) => ({
      categorias: productStoreSelectors.categorias(state),
      categoriasPaginadas: productStoreSelectors.categoriasPaginadas(state),
      fetchCategorias: productStoreSelectors.fetchCategorias(state),
      fetchCategoriasPaginadas:
        productStoreSelectors.fetchCategoriasPaginadas(state),
      fetchErrorMessage: productStoreSelectors.fetchErrorMessage(state),
      isFetchingCategoriesPage:
        productStoreSelectors.isFetchingCategoriesPage(state),
      paginacaoCategorias: productStoreSelectors.paginacaoCategorias(state),
      totalCategorias: productStoreSelectors.totalCategorias(state),
    })),
  );
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState(
    paginacaoCategorias.termo ?? '',
  );
  const { openNewCategoryDialog } = useMainLayoutActions();

  const handleSearch = () => {
    void fetchCategoriasPaginadas({ pagina: 1, termo: searchInput.trim() });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    void fetchCategoriasPaginadas({ pagina: 1, termo: '' });
  };

  useEffect(() => {
    void fetchCategorias();
    void fetchCategoriasPaginadas();
  }, [fetchCategorias, fetchCategoriasPaginadas]);

  const categoryColumns: DataTableColumn<Categoria>[] = [
    {
      id: 'nome',
      header: 'Nome',
      mobile: 'title',
      cell: (category) => category.nome,
    },
    {
      id: 'categoriaSuperior',
      header: 'Categoria Superior',
      cell: (category) => getParentCategoryName(category, categorias),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Categorias"
        description="Consulte as categorias de produtos cadastradas e a hierarquia entre elas."
        actionLabel="Nova categoria"
        onAction={openNewCategoryDialog}
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
      >
        <Grid size={{ xs: 12, md: 12, lg: 20 }}>
          <TextField
            fullWidth
            label="Pesquisar categoria"
            placeholder="Nome da categoria"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={categoriasPaginadas}
        columns={categoryColumns}
        getRowId={(category) => category.id}
        ariaLabel="tabela de categorias"
        emptyMessage="Nenhuma categoria encontrada para a pesquisa informada."
        isLoading={isFetchingCategoriesPage}
        onRowClick={(category) => setEditingCategoryId(category.id)}
        pagination={{
          count: totalCategorias,
          page: Math.max(0, paginacaoCategorias.pagina - 1),
          rowsPerPage: paginacaoCategorias.tamanhoPagina,
          onPageChange: (newPage) => {
            void fetchCategoriasPaginadas({ pagina: newPage + 1 });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchCategoriasPaginadas({
              pagina: 1,
              tamanhoPagina: newRowsPerPage,
            });
          },
        }}
      />

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
