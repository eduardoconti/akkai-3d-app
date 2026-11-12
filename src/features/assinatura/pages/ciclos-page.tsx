import { useEffect, useState } from 'react';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { EditCicloDialog } from '@/features/assinatura';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  MESES_LABEL,
  STATUS_CICLO_COLOR,
  STATUS_CICLO_LABEL,
} from '@/features/assinatura/types/assinatura-form';
import {
  type CicloAssinatura,
  DEFAULT_PAGE_SIZE,
  type DataTableColumn,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  type StatusCiclo,
  StatusChip,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function CiclosPage() {
  const {
    assinantes,
    ciclos,
    fetchAssinantes,
    fetchCiclos,
    fetchErrorMessage,
    isFetching,
    paginacaoCiclos,
    totalCiclos,
  } = useAssinaturaStore(
    useShallow((state) => ({
      assinantes: assinaturaStoreSelectors.assinantes(state),
      ciclos: assinaturaStoreSelectors.ciclos(state),
      fetchAssinantes: assinaturaStoreSelectors.fetchAssinantes(state),
      fetchCiclos: assinaturaStoreSelectors.fetchCiclos(state),
      fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
      isFetching: assinaturaStoreSelectors.isFetching(state),
      paginacaoCiclos: assinaturaStoreSelectors.paginacaoCiclos(state),
      totalCiclos: assinaturaStoreSelectors.totalCiclos(state),
    })),
  );
  const [editingCicloId, setEditingCicloId] = useState<number | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<StatusCiclo | ''>(
    paginacaoCiclos.status ?? '',
  );
  const [idAssinanteFiltro, setIdAssinanteFiltro] = useState<number | ''>(
    paginacaoCiclos.idAssinante ?? '',
  );
  const [mesFiltro, setMesFiltro] = useState<number | ''>(
    paginacaoCiclos.mes ?? '',
  );
  const [anoFiltro, setAnoFiltro] = useState<number | ''>(
    paginacaoCiclos.ano ?? '',
  );
  const { openNewCicloDialog } = useMainLayoutActions();

  useEffect(() => {
    void fetchAssinantes({ tamanhoPagina: DEFAULT_PAGE_SIZE });
    void fetchCiclos();
  }, [fetchAssinantes, fetchCiclos]);

  const handleUpdated = async () => {
    await fetchCiclos({ pagina: 1 });
  };

  const handleSearch = () => {
    void fetchCiclos({
      pagina: 1,
      status: statusFiltro || undefined,
      idAssinante: idAssinanteFiltro || undefined,
      mes: mesFiltro || undefined,
      ano: anoFiltro || undefined,
    });
  };

  const handleClearFilters = () => {
    setStatusFiltro('');
    setIdAssinanteFiltro('');
    setMesFiltro('');
    setAnoFiltro('');
    void fetchCiclos({
      pagina: 1,
      status: undefined,
      idAssinante: undefined,
      mes: undefined,
      ano: undefined,
    });
  };

  const currentYear = new Date().getFullYear();
  const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  const cicloColumns: DataTableColumn<CicloAssinatura>[] = [
    {
      id: 'assinante',
      header: 'Assinante',
      mobile: 'title',
      cell: (c) => c.assinante?.nome ?? `Assinante #${c.idAssinante}`,
    },
    {
      id: 'referencia',
      header: 'Referência',
      cell: (c) => `${MESES_LABEL[c.mesReferencia]} / ${c.anoReferencia}`,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (c) => (
        <StatusChip
          label={STATUS_CICLO_LABEL[c.status]}
          tone={STATUS_CICLO_COLOR[c.status]}
        />
      ),
    },
    {
      id: 'itens',
      header: 'Itens',
      cell: (c) =>
        `${c.itens?.length ?? 0} ${c.itens?.length === 1 ? 'item' : 'itens'}`,
    },
    {
      id: 'rastreio',
      header: 'Rastreio',
      cell: (c) => c.codigoRastreio ?? '-',
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Ciclos"
        description="Acompanhe e gerencie os ciclos de envio dos kits mensais."
        actionLabel="Novo ciclo"
        onAction={openNewCicloDialog}
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 5 }}>
          <TextField
            select
            fullWidth
            label="Assinante"
            value={idAssinanteFiltro}
            onChange={(e) =>
              setIdAssinanteFiltro(
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {assinantes.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 5 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(e.target.value as StatusCiclo | '')
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(STATUS_CICLO_LABEL) as StatusCiclo[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_CICLO_LABEL[s]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 5 }}>
          <TextField
            select
            fullWidth
            label="Mês"
            value={mesFiltro}
            onChange={(e) =>
              setMesFiltro(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(MESES_LABEL).map(([mes, label]) => (
              <MenuItem key={mes} value={Number(mes)}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 5 }}>
          <TextField
            select
            fullWidth
            label="Ano"
            value={anoFiltro}
            onChange={(e) =>
              setAnoFiltro(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {ANOS.map((ano) => (
              <MenuItem key={ano} value={ano}>
                {ano}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={ciclos}
        columns={cicloColumns}
        getRowId={(ciclo) => ciclo.id}
        ariaLabel="tabela de ciclos"
        emptyMessage="Nenhum ciclo encontrado para os filtros informados."
        isLoading={isFetching}
        onRowClick={(ciclo) => setEditingCicloId(ciclo.id)}
        pagination={{
          count: totalCiclos,
          page: Math.max(0, (paginacaoCiclos.pagina ?? 1) - 1),
          rowsPerPage: paginacaoCiclos.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
          onPageChange: (newPage) => {
            void fetchCiclos({ pagina: newPage + 1 });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchCiclos({ pagina: 1, tamanhoPagina: newRowsPerPage });
          },
        }}
      />

      <EditCicloDialog
        open={editingCicloId !== null}
        cicloId={editingCicloId}
        onClose={() => setEditingCicloId(null)}
        onUpdated={handleUpdated}
      />
    </Stack>
  );
}
