import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Link,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { PointOfSale } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import NewBudgetDialog from '@/features/budgets/components/new-budget-dialog';
import NewSaleDialog from '@/features/sales/components/new-sale-dialog';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import {
  budgetStoreSelectors,
  useBudgetStore,
} from '@/features/budgets/store/use-budget-store';
import {
  ALL_CANAIS_ATENDIMENTO_ORCAMENTO,
  ALL_STATUSES_ORCAMENTO,
  CANAL_ATENDIMENTO_ORCAMENTO_LABEL,
  STATUS_ORCAMENTO_LABEL,
  STATUSES_ALTERAVEIS_ORCAMENTO,
} from '@/features/budgets/types/budget-form';
import {
  emptySaleItem,
  initialSaleFormState,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import {
  CurrencyValue,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  type DataTableColumn,
} from '@/shared';
import type {
  CanalAtendimentoOrcamento,
  Orcamento,
  StatusOrcamento,
  TipoVenda,
} from '@/shared/lib/types/domain';
import { formatLocalDate } from '@/shared/utils/date';
import { useShallow } from 'zustand/react/shallow';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR');
}

function buildSaleFormFromBudget(orcamento: Orcamento): SaleFormState {
  const itemName =
    orcamento.descricao?.trim() ||
    `Orçamento #${orcamento.id} - ${orcamento.nomeCliente}`;
  const budgetValue = orcamento.valor ?? 0;

  return {
    ...initialSaleFormState,
    dataVenda: formatLocalDate(),
    tipo: orcamento.tipo,
    idFeira: orcamento.tipo === 'FEIRA' ? (orcamento.idFeira ?? '') : '',
    idOrcamento: orcamento.id,
    desconto: 0,
    descontoModo: 'VALOR',
    itens: [
      {
        ...emptySaleItem,
        tipoItem: 'AVULSO',
        nomeProduto: itemName,
        valorUnitario: budgetValue / 100,
        quantidade: 1,
      },
    ],
    pagamentos: [
      {
        ...initialSaleFormState.pagamentos[0],
        valor: budgetValue / 100,
      },
    ],
  };
}

const STATUS_CHIP_COLOR: Record<
  StatusOrcamento,
  { background: string; border: string; text: string }
> = {
  PENDENTE: {
    background: '#fee2e2',
    border: '#ef4444',
    text: '#991b1b',
  },
  ATENDIMENTO: {
    background: '#fef3c7',
    border: '#f59e0b',
    text: '#92400e',
  },
  AGUARDANDO_APROVACAO: {
    background: '#dbeafe',
    border: '#3b82f6',
    text: '#1e40af',
  },
  APROVADO: {
    background: '#dcfce7',
    border: '#22c55e',
    text: '#166534',
  },
  PRODUZIDO: {
    background: '#ccfbf1',
    border: '#14b8a6',
    text: '#115e59',
  },
  FINALIZADO: {
    background: '#e5e7eb',
    border: '#9ca3af',
    text: '#374151',
  },
  CANCELADO: {
    background: '#f3e8ff',
    border: '#a855f7',
    text: '#6b21a8',
  },
};

const TIPO_LABEL: Record<TipoVenda, string> = {
  FEIRA: 'Feira',
  LOJA: 'Loja',
  ONLINE: 'Online',
  CONSIGNACAO: 'Consignação',
};
const TIPOS_ORCAMENTO: TipoVenda[] = ['LOJA', 'FEIRA', 'ONLINE'];

const STATUS_PADRAO_ORCAMENTO = ALL_STATUSES_ORCAMENTO.filter(
  (status) => status !== 'FINALIZADO',
);

const COLUNAS_VISIVEIS_DESKTOP = [
  'id',
  'cliente',
  'descricao',
  'telefone',
  'tipo',
  'status',
  'valor',
  'dataInclusao',
  'acoes',
] as const;

function SemPropagacao({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex' }}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Box>
  );
}

interface StatusChipProps {
  orcamento: Orcamento;
  onStatusChange: (id: number, status: StatusOrcamento) => void;
  disabled?: boolean;
}

function StatusChip({ orcamento, onStatusChange, disabled }: StatusChipProps) {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const color = STATUS_CHIP_COLOR[orcamento.status];

  return (
    <>
      <Chip
        label={STATUS_ORCAMENTO_LABEL[orcamento.status]}
        size="small"
        clickable={!disabled}
        sx={{
          bgcolor:
            theme.palette.mode === 'dark'
              ? alpha(color.border, 0.22)
              : color.background,
          border: `1px solid ${alpha(color.border, theme.palette.mode === 'dark' ? 0.7 : 1)}`,
          color: theme.palette.mode === 'dark' ? color.background : color.text,
          fontWeight: 700,
          '& .MuiChip-label': {
            px: 1,
          },
          '&:hover': {
            bgcolor:
              theme.palette.mode === 'dark'
                ? alpha(color.border, 0.32)
                : alpha(color.border, 0.18),
          },
        }}
        onClick={
          disabled
            ? undefined
            : (e) => {
                e.stopPropagation();
                setAnchor(e.currentTarget);
              }
        }
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {STATUSES_ALTERAVEIS_ORCAMENTO.map((status) => (
          <MenuItem
            key={status}
            selected={orcamento.status === status}
            onClick={(event) => {
              event.stopPropagation();
              onStatusChange(orcamento.id, status);
              setAnchor(null);
            }}
          >
            {STATUS_ORCAMENTO_LABEL[status]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function BudgetsPage() {
  const {
    atualizarOrcamento,
    fetchErrorMessage,
    fetchOrcamentos,
    isFetching,
    isSubmitting,
    orcamentos,
    paginacao,
    totalItens,
  } = useBudgetStore(
    useShallow((state) => ({
      atualizarOrcamento: budgetStoreSelectors.atualizarOrcamento(state),
      fetchErrorMessage: budgetStoreSelectors.fetchErrorMessage(state),
      fetchOrcamentos: budgetStoreSelectors.fetchOrcamentos(state),
      isFetching: budgetStoreSelectors.isFetching(state),
      isSubmitting: budgetStoreSelectors.isSubmitting(state),
      orcamentos: budgetStoreSelectors.orcamentos(state),
      paginacao: budgetStoreSelectors.paginacao(state),
      totalItens: budgetStoreSelectors.totalItens(state),
    })),
  );
  const [selectedBudget, setSelectedBudget] = useState<Orcamento | null>(null);
  const [finalizingBudget, setFinalizingBudget] = useState<Orcamento | null>(
    null,
  );
  const [statusSelecionados, setStatusSelecionados] = useState<
    StatusOrcamento[]
  >(paginacao.status ?? STATUS_PADRAO_ORCAMENTO);
  const [searchInput, setSearchInput] = useState(paginacao.termo ?? '');
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoVenda | ''>(
    paginacao.tipo ?? '',
  );
  const [canalAtendimentoSelecionado, setCanalAtendimentoSelecionado] =
    useState<CanalAtendimentoOrcamento | ''>(paginacao.canalAtendimento ?? '');
  const { openNewBudgetDialog } = useMainLayoutActions();

  useEffect(() => {
    void fetchOrcamentos();
  }, [fetchOrcamentos]);

  const handleStatusChange = async (id: number, status: StatusOrcamento) => {
    const result = await atualizarOrcamento(id, { status });

    if (result.success) {
      await fetchOrcamentos();
    }
  };

  const handleOpenEditDialog = (budget: Orcamento) => {
    setSelectedBudget(budget);
  };

  const handleOpenFinalizeDialog = (budget: Orcamento) => {
    setFinalizingBudget(budget);
  };

  const handleCloseFinalizeDialog = () => {
    setFinalizingBudget(null);
  };

  const handleFinalizeSaved = async () => {
    await fetchOrcamentos();
    setFinalizingBudget(null);
  };

  const handleCloseDialog = () => {
    setSelectedBudget(null);
  };

  const finalizationSaleForm = useMemo(
    () =>
      finalizingBudget ? buildSaleFormFromBudget(finalizingBudget) : undefined,
    [finalizingBudget],
  );

  const handleClearFilters = () => {
    setStatusSelecionados(STATUS_PADRAO_ORCAMENTO);
    setSearchInput('');
    setTipoSelecionado('');
    setCanalAtendimentoSelecionado('');
    void fetchOrcamentos({
      pagina: 1,
      termo: '',
      status: STATUS_PADRAO_ORCAMENTO,
      tipo: undefined,
      canalAtendimento: undefined,
    });
  };

  const handleSearch = () => {
    void fetchOrcamentos({
      pagina: 1,
      termo: searchInput.trim(),
      status: statusSelecionados,
      tipo: tipoSelecionado === '' ? undefined : tipoSelecionado,
      canalAtendimento:
        tipoSelecionado === 'ONLINE' && canalAtendimentoSelecionado !== ''
          ? canalAtendimentoSelecionado
          : undefined,
    });
  };

  const colunasOrcamentos: DataTableColumn<Orcamento>[] = [
    {
      id: 'id',
      header: 'ID',
      mobile: 'eyebrow',
      cell: (orcamento) => `#${orcamento.id}`,
    },
    {
      id: 'cliente',
      header: 'Cliente',
      mobile: 'title',
      cell: (orcamento) => orcamento.nomeCliente,
    },
    {
      id: 'descricao',
      header: 'Descrição',
      cell: (orcamento) => orcamento.descricao?.trim() || '-',
    },
    {
      id: 'telefone',
      header: 'Telefone',
      cell: (orcamento) => orcamento.telefoneCliente ?? '-',
    },
    {
      id: 'tipo',
      header: 'Tipo',
      cell: (orcamento) => (
        <Stack spacing={0.5}>
          <Typography variant="body2">{TIPO_LABEL[orcamento.tipo]}</Typography>
          {orcamento.tipo === 'FEIRA' && orcamento.feira ? (
            <Typography variant="caption" color="text.secondary">
              {orcamento.feira.nome}
            </Typography>
          ) : null}
          {orcamento.tipo === 'ONLINE' && orcamento.canalAtendimento ? (
            <Typography variant="caption" color="text.secondary">
              {CANAL_ATENDIMENTO_ORCAMENTO_LABEL[orcamento.canalAtendimento]}
            </Typography>
          ) : null}
        </Stack>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (orcamento) => (
        <SemPropagacao>
          <StatusChip
            orcamento={orcamento}
            onStatusChange={handleStatusChange}
            disabled={isSubmitting || orcamento.status === 'FINALIZADO'}
          />
        </SemPropagacao>
      ),
    },
    {
      id: 'valor',
      header: 'Valor',
      cell: (orcamento) =>
        orcamento.valor != null ? (
          <CurrencyValue value={orcamento.valor} />
        ) : (
          '-'
        ),
    },
    {
      id: 'dataInclusao',
      header: 'Data de inclusão',
      cell: (orcamento) => formatDateTime(orcamento.dataInclusao),
    },
    {
      id: 'stl',
      header: 'STL',
      cell: (orcamento) =>
        orcamento.linkSTL ? (
          <Link
            href={orcamento.linkSTL}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            Abrir link
          </Link>
        ) : null,
    },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (orcamento) => (
        <SemPropagacao>
          <Tooltip
            title={
              orcamento.status === 'FINALIZADO'
                ? 'Orçamento já finalizado'
                : 'Finalizar orçamento com venda'
            }
          >
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PointOfSale />}
                disabled={isSubmitting || orcamento.status === 'FINALIZADO'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenFinalizeDialog(orcamento);
                }}
              >
                Finalizar
              </Button>
            </span>
          </Tooltip>
        </SemPropagacao>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Orçamentos"
        description="Registre e acompanhe solicitações de orçamento dos clientes."
        actionLabel="Novo orçamento"
        onAction={openNewBudgetDialog}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
        columns={{ xs: 12, md: 12, lg: 24 }}
      >
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            fullWidth
            label="Pesquisar orçamento"
            placeholder="Cliente, telefone ou descrição"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TextField
            select
            fullWidth
            label="Tipo"
            value={tipoSelecionado}
            onChange={(event) => {
              const nextTipo = event.target.value as TipoVenda | '';
              setTipoSelecionado(nextTipo);

              if (nextTipo !== 'ONLINE') {
                setCanalAtendimentoSelecionado('');
              }
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            {TIPOS_ORCAMENTO.map((tipo) => (
              <MenuItem key={tipo} value={tipo}>
                {TIPO_LABEL[tipo]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {tipoSelecionado === 'ONLINE' ? (
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <TextField
              select
              fullWidth
              label="Canal de atendimento"
              value={canalAtendimentoSelecionado}
              onChange={(event) =>
                setCanalAtendimentoSelecionado(
                  event.target.value as CanalAtendimentoOrcamento | '',
                )
              }
            >
              <MenuItem value="">Todos</MenuItem>
              {ALL_CANAIS_ATENDIMENTO_ORCAMENTO.map((canal) => (
                <MenuItem key={canal} value={canal}>
                  {CANAL_ATENDIMENTO_ORCAMENTO_LABEL[canal]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ) : null}

        <Grid
          size={{
            xs: 12,
            md: 12,
            lg: tipoSelecionado === 'ONLINE' ? 13 : 17,
          }}
        >
          <Autocomplete
            multiple
            fullWidth
            options={ALL_STATUSES_ORCAMENTO}
            value={statusSelecionados}
            onChange={(_event, value) => setStatusSelecionados(value)}
            getOptionLabel={(option) => STATUS_ORCAMENTO_LABEL[option]}
            disableCloseOnSelect
            renderInput={(params) => (
              <TextField
                {...params}
                label="Status"
                placeholder="Selecione um ou mais status"
              />
            )}
          />
        </Grid>
      </SearchFilterPanel>

      <ResponsiveDataTable
        rows={orcamentos}
        columns={colunasOrcamentos}
        visibleColumnIds={COLUNAS_VISIVEIS_DESKTOP}
        getRowId={(orcamento) => orcamento.id}
        ariaLabel="tabela de orçamentos"
        emptyMessage="Nenhum orçamento cadastrado até o momento."
        isLoading={isFetching}
        onRowClick={handleOpenEditDialog}
        pagination={{
          count: totalItens,
          page: Math.max(0, paginacao.pagina - 1),
          rowsPerPage: paginacao.tamanhoPagina,
          onPageChange: (novaPagina) => {
            void fetchOrcamentos({ pagina: novaPagina + 1 });
          },
          onRowsPerPageChange: (novoTamanho) => {
            void fetchOrcamentos({ pagina: 1, tamanhoPagina: novoTamanho });
          },
        }}
      />

      <NewBudgetDialog
        open={selectedBudget !== null}
        budget={selectedBudget}
        onClose={handleCloseDialog}
      />
      <NewSaleDialog
        open={Boolean(finalizingBudget)}
        draftKey={finalizingBudget ? `orcamento-${finalizingBudget.id}` : ''}
        initialForm={finalizationSaleForm}
        onClose={handleCloseFinalizeDialog}
        onSaved={handleFinalizeSaved}
      />
    </Stack>
  );
}
