import { useEffect, useState } from 'react';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import RevendedorDialog from '@/features/consignacao/components/revendedor-dialog';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import {
  type DataTableColumn,
  PageHeader,
  ResponsiveDataTable,
  type Revendedor,
  SearchFilterPanel,
  type StatusRevendedor,
  StatusChip,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatPercentual(value?: number | null): string {
  return `${(value ?? 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })}%`;
}

export default function RevendedoresPage() {
  const {
    fetchErrorMessage,
    fetchRevendedores,
    isFetching,
    paginacao,
    revendedores,
    totalRevendedores,
  } = useConsignacaoStore(
    useShallow((state) => ({
      fetchErrorMessage: consignacaoStoreSelectors.fetchErrorMessage(state),
      fetchRevendedores: consignacaoStoreSelectors.fetchRevendedores(state),
      isFetching: consignacaoStoreSelectors.isFetching(state),
      paginacao: consignacaoStoreSelectors.paginacaoRevendedores(state),
      revendedores: consignacaoStoreSelectors.revendedores(state),
      totalRevendedores: consignacaoStoreSelectors.totalRevendedores(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRevendedorId, setEditingRevendedorId] = useState<number | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState(paginacao.termo ?? '');
  const [statusFiltro, setStatusFiltro] = useState<StatusRevendedor | ''>(
    paginacao.status ?? '',
  );
  const [ordenarPor, setOrdenarPor] = useState<'nome' | 'dataInclusao'>(
    paginacao.ordenarPor ?? 'nome',
  );

  useEffect(() => {
    void fetchRevendedores();
  }, [fetchRevendedores]);

  const handleSearch = () => {
    void fetchRevendedores({
      pagina: 1,
      termo: searchInput.trim(),
      status: statusFiltro === '' ? undefined : statusFiltro,
      ordenarPor,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setStatusFiltro('');
    setOrdenarPor('nome');
    void fetchRevendedores({
      pagina: 1,
      termo: '',
      status: undefined,
      ordenarPor: 'nome',
    });
  };

  const handleDialogSaved = async () => {
    await fetchRevendedores();
  };

  const revendedorColumns: DataTableColumn<Revendedor>[] = [
    { id: 'nome', header: 'Nome', mobile: 'title', cell: (r) => r.nome },
    { id: 'telefone', header: 'Telefone', cell: (r) => r.telefone || '-' },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (r) => (
        <StatusChip
          label={r.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
          tone={r.status === 'ATIVO' ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'desconto',
      header: 'Desconto',
      align: 'right',
      cell: (r) => formatPercentual(r.percentualDesconto),
    },
    {
      id: 'dataInclusao',
      header: 'Data inclusão',
      cell: (r) => formatDateTime(r.dataInclusao),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Revendedores"
        description="Gerencie os parceiros que recebem peças em consignação."
        actionLabel="Novo revendedor"
        onAction={() => setDialogOpen(true)}
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
        columns={{ xs: 12, md: 12 }}
      >
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            fullWidth
            label="Pesquisar revendedor"
            placeholder="Nome ou telefone"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFiltro}
            onChange={(event) =>
              setStatusFiltro(event.target.value as StatusRevendedor | '')
            }
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ATIVO">Ativo</MenuItem>
            <MenuItem value="INATIVO">Inativo</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as 'nome' | 'dataInclusao')
            }
          >
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="dataInclusao">Data inclusão</MenuItem>
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={revendedores}
        columns={revendedorColumns}
        getRowId={(revendedor) => revendedor.id}
        ariaLabel="tabela de revendedores"
        emptyMessage="Nenhum revendedor cadastrado até o momento."
        isLoading={isFetching}
        onRowClick={(revendedor) => setEditingRevendedorId(revendedor.id)}
        pagination={{
          count: totalRevendedores,
          page: Math.max(0, paginacao.pagina - 1),
          rowsPerPage: paginacao.tamanhoPagina,
          onPageChange: (newPage) => {
            void fetchRevendedores({ pagina: newPage + 1 });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchRevendedores({
              pagina: 1,
              tamanhoPagina: newRowsPerPage,
            });
          },
        }}
      />

      <RevendedorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleDialogSaved}
      />
      <RevendedorDialog
        open={editingRevendedorId !== null}
        revendedorId={editingRevendedorId}
        onClose={() => setEditingRevendedorId(null)}
        onSaved={handleDialogSaved}
      />
    </Stack>
  );
}
