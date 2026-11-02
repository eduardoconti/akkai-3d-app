import { useEffect, useState, type MouseEvent } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Inventory2 } from '@mui/icons-material';
import EditProductDialog from '../components/edit-product-dialog';
import StockManagementDialog from '../components/stock-management-dialog';
import {
  productStoreSelectors,
  useProductStore,
} from '../store/use-product-store';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  CurrencyValue,
  formatCentsForCsv,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  TableColumnVisibilityButton,
  type Categoria,
  type DataTableColumn,
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
  const { visibleColumnIds, toggleColumnVisibility, resetColumnVisibility } =
    useTableColumnVisibility<ProductTableColumnId>(
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

  const productColumns: DataTableColumn<Produto>[] = [
    {
      id: 'codigo',
      header: 'Código',
      mobile: 'eyebrow',
      exportValue: (produto) => produto.codigo,
      cell: (produto) => produto.codigo,
    },
    {
      id: 'nome',
      header: 'Nome',
      mobile: 'title',
      exportValue: (produto) => produto.nome,
      cell: (produto) => produto.nome,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      exportValue: (produto) => getStatusProductLabel(produto),
      cell: (produto) => (
        <Chip
          label={getStatusProductLabel(produto)}
          size="small"
          color={getStatusProductColor(produto)}
          variant={produto.status === 'ATIVO' ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      id: 'categoria',
      header: 'Categoria',
      exportValue: (produto) => produto.categoria?.nome ?? '',
      cell: (produto) => produto.categoria?.nome ?? '-',
    },
    {
      id: 'descricao',
      header: 'Descrição',
      exportValue: (produto) => produto.descricao ?? '',
      cell: (produto) => produto.descricao || '-',
    },
    {
      id: 'estoque',
      header: 'Estoque',
      align: 'center',
      exportValue: (produto) => getStockQuantity(produto),
      cell: (produto) => (
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
      ),
    },
    {
      id: 'valor',
      header: 'Valor',
      align: 'right',
      exportValue: (produto) => formatCentsForCsv(produto.valor),
      cell: (produto) => <CurrencyValue value={produto.valor} />,
    },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (produto) => (
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<Inventory2 fontSize="small" />}
          onClick={(event) => openStockDialog(event, produto)}
        >
          Movimentar
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Produtos"
        description="Consulte nome, código, categoria, descrição e valor dos produtos cadastrados."
        actionLabel="Novo produto"
        onAction={openNewProductDialog}
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
      >
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

      <ResponsiveDataTable
        rows={produtos}
        columns={productColumns}
        getRowId={(produto) => produto.id}
        ariaLabel="tabela de produtos"
        emptyMessage="Nenhum produto encontrado para a pesquisa informada."
        isLoading={isFetchingProducts}
        onRowClick={(produto) => setEditingProductId(produto.id)}
        visibleColumnIds={visibleColumnIds}
        minTableWidth={780}
        exportFileName="produtos"
        toolbar={
          <TableColumnVisibilityButton
            columns={PRODUCT_TABLE_COLUMNS}
            visibleColumnIds={visibleColumnIds}
            onToggleColumn={toggleColumnVisibility}
            onResetColumns={resetColumnVisibility}
          />
        }
        pagination={{
          count: totalItens,
          page: Math.max(0, paginacao.pagina - 1),
          rowsPerPage: paginacao.tamanhoPagina,
          onPageChange: (newPage) => {
            void fetchProdutos({ pagina: newPage + 1 });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchProdutos({ pagina: 1, tamanhoPagina: newRowsPerPage });
          },
        }}
      />

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
