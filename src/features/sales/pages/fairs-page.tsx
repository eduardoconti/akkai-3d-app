import { useEffect, useState } from 'react';
import { Alert, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
import FairDialog from '../components/fair-dialog';
import FairProductPricesDialog from '../components/fair-product-prices-dialog';
import { saleStoreSelectors, useSaleStore } from '../store/use-sale-store';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  type DataTableColumn,
  type Feira,
  PageHeader,
  ResponsiveDataTable,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function FairsPage() {
  const {
    feirasPaginadas,
    fetchErrorMessage,
    fetchFeirasPaginadas,
    isFetching,
    paginacaoFeiras,
    totalFeiras,
  } = useSaleStore(
    useShallow((state) => ({
      feirasPaginadas: saleStoreSelectors.feirasPaginadas(state),
      fetchErrorMessage: saleStoreSelectors.fetchErrorMessage(state),
      fetchFeirasPaginadas: saleStoreSelectors.fetchFeirasPaginadas(state),
      isFetching: saleStoreSelectors.isFetching(state),
      paginacaoFeiras: saleStoreSelectors.paginacaoFeiras(state),
      totalFeiras: saleStoreSelectors.totalFeiras(state),
    })),
  );
  const [editingFairId, setEditingFairId] = useState<number | null>(null);
  const [pricingFairId, setPricingFairId] = useState<number | null>(null);
  const { openFairDialog } = useMainLayoutActions();

  useEffect(() => {
    void fetchFeirasPaginadas();
  }, [fetchFeirasPaginadas]);

  const fairColumns: DataTableColumn<Feira>[] = [
    {
      id: 'nome',
      header: 'Nome',
      mobile: 'title',
      cell: (feira) => feira.nome,
    },
    { id: 'local', header: 'Local', cell: (feira) => feira.local ?? '-' },
    {
      id: 'descricao',
      header: 'Descrição',
      cell: (feira) => feira.descricao ?? '-',
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (feira) => (
        <Chip
          size="small"
          color={feira.ativa ? 'success' : 'default'}
          variant="outlined"
          label={feira.ativa ? 'Ativa' : 'Inativa'}
        />
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (feira) => (
        <Tooltip title="Preços da feira">
          <IconButton
            aria-label={`Preços da feira ${feira.nome}`}
            onClick={(event) => {
              event.stopPropagation();
              setPricingFairId(feira.id);
            }}
          >
            <LocalOffer />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Feiras"
        description="Gerencie as feiras disponíveis para vendas presenciais e relatórios."
        actionLabel="Nova feira"
        onAction={openFairDialog}
        breakpoint="lg"
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={feirasPaginadas}
        columns={fairColumns}
        getRowId={(feira) => feira.id}
        ariaLabel="tabela de feiras"
        emptyMessage="Nenhuma feira cadastrada até o momento."
        isLoading={isFetching}
        onRowClick={(feira) => setEditingFairId(feira.id)}
        pagination={{
          count: totalFeiras,
          page: Math.max(0, paginacaoFeiras.pagina - 1),
          rowsPerPage: paginacaoFeiras.tamanhoPagina,
          onPageChange: (newPage) => {
            void fetchFeirasPaginadas({ pagina: newPage + 1 });
          },
          onRowsPerPageChange: (newRowsPerPage) => {
            void fetchFeirasPaginadas({
              pagina: 1,
              tamanhoPagina: newRowsPerPage,
            });
          },
        }}
      />

      <FairDialog
        open={editingFairId !== null}
        fairId={editingFairId}
        onClose={() => setEditingFairId(null)}
      />
      <FairProductPricesDialog
        open={pricingFairId !== null}
        fairId={pricingFairId}
        fairName={
          feirasPaginadas.find((feira) => feira.id === pricingFairId)?.nome
        }
        onClose={() => setPricingFairId(null)}
      />
    </Stack>
  );
}
