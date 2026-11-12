import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Link,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
  ListItemText,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { PointOfSale } from '@mui/icons-material';
import NewBudgetDialog from '@/features/budgets/components/new-budget-dialog';
import { buildSaleFormFromBudget } from '@/features/budgets/utils/build-sale-form-from-budget';
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
  STATUSES_PADRAO_PESQUISA_ORCAMENTO,
} from '@/features/budgets/types/budget-form';
import {
  CurrencyValue,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  StatusChip,
  summarizeSelection,
  type StatusChipTone,
  type DataTableColumn,
} from '@/shared';
import type {
  CanalAtendimentoOrcamento,
  Orcamento,
  StatusOrcamento,
  TipoVenda,
} from '@/shared/lib/types/domain';
import { useShallow } from 'zustand/react/shallow';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR');
}

/** Tom de cada status: âmbar pede ação, verde é positivo, neutro encerrado. */
const STATUS_CHIP_TONE: Record<StatusOrcamento, StatusChipTone> = {
  PENDENTE: 'warning',
  ATENDIMENTO: 'info',
  AGUARDANDO_APROVACAO: 'secondary',
  APROVADO: 'success',
  PRODUZIDO: 'primary',
  FINALIZADO: 'default',
  CANCELADO: 'error',
};

const STATUS_FILTER_OPTIONS = ALL_STATUSES_ORCAMENTO.map((status) => ({
  value: status,
  label: STATUS_ORCAMENTO_LABEL[status],
}));

const TIPO_LABEL: Record<TipoVenda, string> = {
  FEIRA: 'Feira',
  LOJA: 'Loja',
  ONLINE: 'Online',
  CONSIGNACAO: 'Consignação',
};
const TIPOS_ORCAMENTO: TipoVenda[] = ['LOJA', 'FEIRA', 'ONLINE'];

const COLUNAS_VISIVEIS_DESKTOP = [
  'id',
  'cliente',
  'descricao',
  'produtos',
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

function StatusMenuChip({
  orcamento,
  onStatusChange,
  disabled,
}: StatusChipProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <StatusChip
        label={STATUS_ORCAMENTO_LABEL[orcamento.status]}
        tone={STATUS_CHIP_TONE[orcamento.status]}
        clickable={!disabled}
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
  >(paginacao.status ?? STATUSES_PADRAO_PESQUISA_ORCAMENTO);
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
    setStatusSelecionados(STATUSES_PADRAO_PESQUISA_ORCAMENTO);
    setSearchInput('');
    setTipoSelecionado('');
    setCanalAtendimentoSelecionado('');
    void fetchOrcamentos({
      pagina: 1,
      termo: '',
      status: STATUSES_PADRAO_PESQUISA_ORCAMENTO,
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
      id: 'produtos',
      header: 'Produtos',
      cell: (orcamento) => {
        const itens = orcamento.itens ?? [];

        if (itens.length === 0) {
          return '-';
        }

        const resumo = itens
          .map((item) => `${item.quantidade}× ${item.nomeProduto}`)
          .join(', ');

        return (
          <Tooltip title={resumo}>
            <span>
              {itens.length === 1 ? '1 produto' : `${itens.length} produtos`}
            </span>
          </Tooltip>
        );
      },
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
          <StatusMenuChip
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
        <Grid size={{ xs: 12, md: 6, lg: 7 }}>
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
            // Mostra "Todos" quando vazio, como nos demais filtros.
            slotProps={{
              select: { displayEmpty: true },
              inputLabel: { shrink: true },
            }}
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
            lg: tipoSelecionado === 'ONLINE' ? 10 : 14,
          }}
        >
          {/* Caixas de seleção, com um resumo em texto no campo (sem chips). */}
          <TextField
            select
            fullWidth
            label="Status"
            value={statusSelecionados}
            onChange={(event) => {
              const { value } = event.target as { value: unknown };
              setStatusSelecionados(value as StatusOrcamento[]);
            }}
            slotProps={{
              select: {
                multiple: true,
                displayEmpty: true,
                renderValue: (selected) =>
                  summarizeSelection(
                    selected as StatusOrcamento[],
                    STATUS_FILTER_OPTIONS,
                    'status',
                    'Todos',
                  ) || 'Todos',
              },
            }}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} dense>
                <Checkbox
                  size="small"
                  checked={statusSelecionados.includes(option.value)}
                  sx={{ py: 0, pl: 0 }}
                />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </TextField>
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
        budgetTargetCents={finalizingBudget?.valor}
        onClose={handleCloseFinalizeDialog}
        onSaved={handleFinalizeSaved}
      />
    </Stack>
  );
}
