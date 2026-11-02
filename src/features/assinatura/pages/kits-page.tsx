import { useEffect, useState } from 'react';
import { Alert, Button, Chip, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { AutoAwesome } from '@mui/icons-material';
import { EditKitDialog } from '@/features/assinatura';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import { MESES_LABEL } from '@/features/assinatura/types/assinatura-form';
import {
  DEFAULT_PAGE_SIZE,
  type DataTableColumn,
  type KitMensal,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  useFeedbackStore,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function KitsPage() {
  const {
    fetchErrorMessage,
    fetchKits,
    fetchPlanos,
    gerarCiclosMensais,
    isFetching,
    isSubmitting,
    kits,
    paginacaoKits,
    planos,
    submitErrorMessage,
    totalKits,
  } = useAssinaturaStore(
    useShallow((state) => ({
      fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
      fetchKits: assinaturaStoreSelectors.fetchKits(state),
      fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
      gerarCiclosMensais: assinaturaStoreSelectors.gerarCiclosMensais(state),
      isFetching: assinaturaStoreSelectors.isFetching(state),
      isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
      kits: assinaturaStoreSelectors.kits(state),
      paginacaoKits: assinaturaStoreSelectors.paginacaoKits(state),
      planos: assinaturaStoreSelectors.planos(state),
      submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
      totalKits: assinaturaStoreSelectors.totalKits(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [editingKitId, setEditingKitId] = useState<number | null>(null);
  const [idPlanoFiltro, setIdPlanoFiltro] = useState<number | ''>(
    paginacaoKits.idPlano ?? '',
  );
  const [mesFiltro, setMesFiltro] = useState<number | ''>(
    paginacaoKits.mes ?? '',
  );
  const [anoFiltro, setAnoFiltro] = useState<number | ''>(
    paginacaoKits.ano ?? '',
  );
  const { openNewKitDialog } = useMainLayoutActions();

  useEffect(() => {
    void fetchPlanos();
    void fetchKits();
  }, [fetchKits, fetchPlanos]);

  const handleUpdated = async () => {
    await fetchKits({ pagina: 1 });
  };

  const handleSearch = () => {
    void fetchKits({
      pagina: 1,
      idPlano: idPlanoFiltro || undefined,
      mes: mesFiltro || undefined,
      ano: anoFiltro || undefined,
    });
  };

  const handleClearFilters = () => {
    setIdPlanoFiltro('');
    setMesFiltro('');
    setAnoFiltro('');
    void fetchKits({
      pagina: 1,
      idPlano: undefined,
      mes: undefined,
      ano: undefined,
    });
  };

  const handleGerarCiclos = async (idKit: number) => {
    const result = await gerarCiclosMensais(idKit);

    if (!result.success) {
      return;
    }

    const { criados, ignorados } = result.data;
    if (criados > 0) {
      showSuccess(
        `${criados} ${criados === 1 ? 'ciclo criado' : 'ciclos criados'}${ignorados > 0 ? ` e ${ignorados} ${ignorados === 1 ? 'assinante ignorado' : 'assinantes ignorados'}` : ''}.`,
      );
      return;
    }

    showSuccess(
      'Nenhum ciclo criado. Todos os assinantes já possuem ciclo para este período.',
    );
  };

  const currentYear = new Date().getFullYear();
  const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  const kitColumns: DataTableColumn<KitMensal>[] = [
    {
      id: 'plano',
      header: 'Plano',
      mobile: 'title',
      cell: (k) => k.plano?.nome ?? `Plano #${k.idPlano}`,
    },
    {
      id: 'referencia',
      header: 'Referência',
      cell: (k) => `${MESES_LABEL[k.mesReferencia]} / ${k.anoReferencia}`,
    },
    {
      id: 'itens',
      header: 'Itens',
      cell: (k) =>
        `${k.itens?.length ?? 0} ${k.itens?.length === 1 ? 'item' : 'itens'}`,
    },
    {
      id: 'vitrine',
      header: 'Vitrine',
      mobile: 'hidden',
      cell: (k) =>
        k.ativo ? (
          <Chip size="small" label="Ativo" color="success" variant="outlined" />
        ) : k.titulo ? (
          <Chip size="small" label="Inativo" variant="outlined" />
        ) : null,
    },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (k) => (
        <Button
          size="small"
          variant="outlined"
          startIcon={<AutoAwesome />}
          disabled={isSubmitting}
          onClick={(event) => {
            event.stopPropagation();
            void handleGerarCiclos(k.id);
          }}
        >
          Gerar ciclos
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Kits mensais"
        description="Defina o kit de produtos de cada plano por mês e gere os ciclos de envio."
        actionLabel="Novo kit"
        onAction={openNewKitDialog}
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
      >
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

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 6 }}>
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

        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 7 }}>
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
      {submitErrorMessage ? (
        <Alert severity="error">{submitErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={kits}
        columns={kitColumns}
        getRowId={(kit) => kit.id}
        ariaLabel="tabela de kits mensais"
        emptyMessage="Nenhum kit encontrado para os filtros informados."
        isLoading={isFetching}
        onRowClick={(kit) => setEditingKitId(kit.id)}
        pagination={{
          count: totalKits,
          page: Math.max(0, (paginacaoKits.pagina ?? 1) - 1),
          rowsPerPage: paginacaoKits.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
          onPageChange: (newPage) => {
            void fetchKits({ pagina: newPage + 1 });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchKits({ pagina: 1, tamanhoPagina: newRowsPerPage });
          },
        }}
      />

      <EditKitDialog
        open={editingKitId !== null}
        kitId={editingKitId}
        onClose={() => setEditingKitId(null)}
        onUpdated={handleUpdated}
      />
    </Stack>
  );
}
