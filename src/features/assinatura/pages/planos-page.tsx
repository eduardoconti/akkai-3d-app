import { useEffect, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { EditPlanDialog } from '@/features/assinatura';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  CurrencyValue,
  DEFAULT_PAGE_SIZE,
  type DataTableColumn,
  PageHeader,
  type PlanoAssinatura,
  ResponsiveDataTable,
  StatusChip,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function PlanosPage() {
  const { fetchErrorMessage, fetchPlanos, isFetching, planos } =
    useAssinaturaStore(
      useShallow((state) => ({
        fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
        fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
        isFetching: assinaturaStoreSelectors.isFetching(state),
        planos: assinaturaStoreSelectors.planos(state),
      })),
    );
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const { openNewPlanDialog } = useMainLayoutActions();

  useEffect(() => {
    void fetchPlanos();
  }, [fetchPlanos]);

  const sortedPlanos = useMemo(
    () => [...planos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [planos],
  );

  const paginatedPlanos = useMemo(
    () =>
      sortedPlanos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedPlanos],
  );

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(sortedPlanos.length / rowsPerPage) - 1,
    );
    if (page > maxPage) setPage(maxPage);
  }, [page, rowsPerPage, sortedPlanos.length]);

  const planoColumns: DataTableColumn<PlanoAssinatura>[] = [
    { id: 'nome', header: 'Nome', mobile: 'title', cell: (p) => p.nome },
    {
      id: 'descricao',
      header: 'Descrição',
      cell: (p) => p.descricao ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (p) => (
        <StatusChip
          label={p.ativo ? 'Ativo' : 'Inativo'}
          tone={p.ativo ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'valor',
      header: 'Valor/mês',
      align: 'right',
      cell: (p) => (
        <Typography
          component="span"
          variant="inherit"
          fontWeight={700}
          color="primary.main"
        >
          <CurrencyValue value={p.valor} />
        </Typography>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Planos"
        description="Cadastre os planos de kit mensal para oferecer aos assinantes."
        actionLabel="Novo plano"
        onAction={openNewPlanDialog}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={paginatedPlanos}
        columns={planoColumns}
        getRowId={(plano) => plano.id}
        ariaLabel="tabela de planos"
        emptyMessage="Nenhum plano cadastrado até o momento."
        isLoading={isFetching}
        onRowClick={(plano) => setEditingPlanId(plano.id)}
        pagination={{
          count: sortedPlanos.length,
          page,
          rowsPerPage,
          onPageChange: setPage,
          onRowsPerPageChange: (newRowsPerPage) => {
            setRowsPerPage(newRowsPerPage);
            setPage(0);
          },
        }}
      />

      <EditPlanDialog
        open={editingPlanId !== null}
        planId={editingPlanId}
        onClose={() => setEditingPlanId(null)}
        onUpdated={fetchPlanos}
      />
    </Stack>
  );
}
