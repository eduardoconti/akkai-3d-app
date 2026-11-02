import { useEffect, useState } from 'react';
import { Alert, Chip, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { EditAssinanteDialog } from '@/features/assinatura';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  STATUS_ASSINANTE_COLOR,
  STATUS_ASSINANTE_LABEL,
} from '@/features/assinatura/types/assinatura-form';
import {
  type Assinante,
  DEFAULT_PAGE_SIZE,
  type DataTableColumn,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  type StatusAssinante,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function AssinantesPage() {
  const {
    assinantes,
    fetchAssinantes,
    fetchErrorMessage,
    fetchPlanos,
    isFetching,
    paginacaoAssinantes,
    planos,
    totalAssinantes,
  } = useAssinaturaStore(
    useShallow((state) => ({
      assinantes: assinaturaStoreSelectors.assinantes(state),
      fetchAssinantes: assinaturaStoreSelectors.fetchAssinantes(state),
      fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
      fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
      isFetching: assinaturaStoreSelectors.isFetching(state),
      paginacaoAssinantes: assinaturaStoreSelectors.paginacaoAssinantes(state),
      planos: assinaturaStoreSelectors.planos(state),
      totalAssinantes: assinaturaStoreSelectors.totalAssinantes(state),
    })),
  );
  const [editingAssinanteId, setEditingAssinanteId] = useState<number | null>(
    null,
  );
  const [termo, setTermo] = useState(paginacaoAssinantes.termo ?? '');
  const [statusFiltro, setStatusFiltro] = useState<StatusAssinante | ''>(
    paginacaoAssinantes.status ?? '',
  );
  const [idPlanoFiltro, setIdPlanoFiltro] = useState<number | ''>(
    paginacaoAssinantes.idPlano ?? '',
  );
  const { openNewAssinanteDialog } = useMainLayoutActions();

  useEffect(() => {
    void fetchPlanos();
    void fetchAssinantes();
  }, [fetchAssinantes, fetchPlanos]);

  const handleUpdated = async () => {
    await fetchAssinantes({ pagina: 1 });
  };

  const handleSearch = () => {
    void fetchAssinantes({
      pagina: 1,
      termo: termo.trim(),
      status: statusFiltro || undefined,
      idPlano: idPlanoFiltro || undefined,
    });
  };

  const handleClearFilters = () => {
    setTermo('');
    setStatusFiltro('');
    setIdPlanoFiltro('');
    void fetchAssinantes({
      pagina: 1,
      termo: '',
      status: undefined,
      idPlano: undefined,
    });
  };

  const assinanteColumns: DataTableColumn<Assinante>[] = [
    { id: 'nome', header: 'Nome', mobile: 'title', cell: (a) => a.nome },
    {
      id: 'email',
      header: 'E-mail',
      cell: (a) => a.email ?? '—',
    },
    {
      id: 'telefone',
      header: 'Telefone',
      cell: (a) => a.telefone ?? '—',
    },
    {
      id: 'plano',
      header: 'Plano',
      cell: (a) => a.plano?.nome ?? `Plano #${a.idPlano}`,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (a) => (
        <Chip
          size="small"
          label={STATUS_ASSINANTE_LABEL[a.status]}
          color={STATUS_ASSINANTE_COLOR[a.status]}
          variant="outlined"
        />
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Assinantes"
        description="Gerencie os assinantes dos kits mensais e seus planos."
        actionLabel="Novo assinante"
        onAction={openNewAssinanteDialog}
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
      >
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 7 }}>
          <TextField
            fullWidth
            label="Pesquisar"
            placeholder="Nome, e-mail ou telefone"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 6 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(e.target.value as StatusAssinante | '')
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(STATUS_ASSINANTE_LABEL) as StatusAssinante[]).map(
              (s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_ASSINANTE_LABEL[s]}
                </MenuItem>
              ),
            )}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 7 }}>
          <TextField
            select
            fullWidth
            label="Plano"
            value={idPlanoFiltro}
            onChange={(e) =>
              setIdPlanoFiltro(
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {planos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={assinantes}
        columns={assinanteColumns}
        getRowId={(assinante) => assinante.id}
        ariaLabel="tabela de assinantes"
        emptyMessage="Nenhum assinante encontrado para os filtros informados."
        isLoading={isFetching}
        onRowClick={(assinante) => setEditingAssinanteId(assinante.id)}
        pagination={{
          count: totalAssinantes,
          page: Math.max(0, (paginacaoAssinantes.pagina ?? 1) - 1),
          rowsPerPage: paginacaoAssinantes.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
          onPageChange: (newPage) => {
            void fetchAssinantes({ pagina: newPage + 1 });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchAssinantes({ pagina: 1, tamanhoPagina: newRowsPerPage });
          },
        }}
      />

      <EditAssinanteDialog
        open={editingAssinanteId !== null}
        assinanteId={editingAssinanteId}
        onClose={() => setEditingAssinanteId(null)}
        onUpdated={handleUpdated}
      />
    </Stack>
  );
}
