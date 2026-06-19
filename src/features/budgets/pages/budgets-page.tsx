import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  Link,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { PointOfSale } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import NewBudgetDialog from '@/features/budgets/components/new-budget-dialog';
import NewSaleDialog from '@/features/sales/components/new-sale-dialog';
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
  AppTablePagination,
  CurrencyValue,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchFilterPanel,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
  const [dialogOpen, setDialogOpen] = useState(false);
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

  useEffect(() => {
    void fetchOrcamentos();
  }, [fetchOrcamentos]);

  const handleStatusChange = async (id: number, status: StatusOrcamento) => {
    const result = await atualizarOrcamento(id, { status });

    if (result.success) {
      await fetchOrcamentos();
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedBudget(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (budget: Orcamento) => {
    setSelectedBudget(budget);
    setDialogOpen(true);
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
    setDialogOpen(false);
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

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Orçamentos"
        description="Registre e acompanhe solicitações de orçamento dos clientes."
        actionLabel="Novo orçamento"
        onAction={handleOpenCreateDialog}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <SearchFilterPanel
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

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack
            divider={<Divider flexItem />}
            aria-label="lista de orçamentos"
          >
            {isFetching ? (
              <LoadingState />
            ) : orcamentos.length > 0 ? (
              orcamentos.map((orcamento) => (
                <Box
                  key={orcamento.id}
                  sx={{
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => handleOpenEditDialog(orcamento)}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1.5}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          Orçamento #{orcamento.id}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {orcamento.nomeCliente}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flexShrink: 0 }}
                      >
                        {formatDateTime(orcamento.dataInclusao)}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Box onClick={(event) => event.stopPropagation()}>
                        <StatusChip
                          orcamento={orcamento}
                          onStatusChange={handleStatusChange}
                          disabled={
                            isSubmitting || orcamento.status === 'FINALIZADO'
                          }
                        />
                      </Box>
                      <Chip
                        label={TIPO_LABEL[orcamento.tipo]}
                        size="small"
                        variant="outlined"
                      />
                      {orcamento.tipo === 'ONLINE' &&
                      orcamento.canalAtendimento ? (
                        <Chip
                          label={
                            CANAL_ATENDIMENTO_ORCAMENTO_LABEL[
                              orcamento.canalAtendimento
                            ]
                          }
                          size="small"
                          variant="outlined"
                        />
                      ) : null}
                    </Stack>

                    <Box>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PointOfSale />}
                        disabled={
                          isSubmitting || orcamento.status === 'FINALIZADO'
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenFinalizeDialog(orcamento);
                        }}
                      >
                        Finalizar
                      </Button>
                    </Box>

                    {orcamento.telefoneCliente ? (
                      <Typography variant="body2" color="text.secondary">
                        Telefone: {orcamento.telefoneCliente}
                      </Typography>
                    ) : null}

                    {orcamento.tipo === 'FEIRA' && orcamento.feira ? (
                      <Typography variant="body2" color="text.secondary">
                        Feira: {orcamento.feira.nome}
                      </Typography>
                    ) : null}

                    <Stack direction="row" spacing={2}>
                      {orcamento.valor != null ? (
                        <Typography variant="body2" color="text.secondary">
                          Valor: <CurrencyValue value={orcamento.valor} />
                        </Typography>
                      ) : null}
                      {orcamento.quantidade != null ? (
                        <Typography variant="body2" color="text.secondary">
                          Qtd: {orcamento.quantidade}
                        </Typography>
                      ) : null}
                    </Stack>

                    {orcamento.descricao ? (
                      <Typography variant="body2" color="text.secondary">
                        Descrição: {orcamento.descricao}
                      </Typography>
                    ) : null}

                    {orcamento.linkSTL ? (
                      <Typography variant="body2" color="text.secondary">
                        STL:{' '}
                        <Link
                          href={orcamento.linkSTL}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Abrir link
                        </Link>
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum orçamento cadastrado até o momento." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de orçamentos">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>ID</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Cliente</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Telefone</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Tipo</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Valor</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Qtd</strong>
                  </TableCell>

                  <TableCell>
                    <strong>Data de inclusão</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Ações</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : orcamentos.length > 0 ? (
                  orcamentos.map((orcamento) => (
                    <TableRow
                      key={orcamento.id}
                      hover
                      onClick={() => handleOpenEditDialog(orcamento)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>#{orcamento.id}</TableCell>
                      <TableCell>{orcamento.nomeCliente}</TableCell>
                      <TableCell>
                        {orcamento.descricao?.trim() || '-'}
                      </TableCell>
                      <TableCell>{orcamento.telefoneCliente ?? '-'}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            {TIPO_LABEL[orcamento.tipo]}
                          </Typography>
                          {orcamento.tipo === 'FEIRA' && orcamento.feira ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {orcamento.feira.nome}
                            </Typography>
                          ) : null}
                          {orcamento.tipo === 'ONLINE' &&
                          orcamento.canalAtendimento ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {
                                CANAL_ATENDIMENTO_ORCAMENTO_LABEL[
                                  orcamento.canalAtendimento
                                ]
                              }
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <StatusChip
                          orcamento={orcamento}
                          onStatusChange={handleStatusChange}
                          disabled={
                            isSubmitting || orcamento.status === 'FINALIZADO'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {orcamento.valor != null ? (
                          <CurrencyValue value={orcamento.valor} />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{orcamento.quantidade ?? '-'}</TableCell>

                      <TableCell>
                        {formatDateTime(orcamento.dataInclusao)}
                      </TableCell>
                      <TableCell
                        align="right"
                        onClick={(event) => event.stopPropagation()}
                      >
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
                              disabled={
                                isSubmitting ||
                                orcamento.status === 'FINALIZADO'
                              }
                              onClick={() =>
                                handleOpenFinalizeDialog(orcamento)
                              }
                            >
                              Finalizar
                            </Button>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum orçamento cadastrado até o momento." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalItens}
          page={Math.max(0, paginacao.pagina - 1)}
          rowsPerPage={paginacao.tamanhoPagina}
          onPageChange={(_event, newPage) => {
            void fetchOrcamentos({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchOrcamentos({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <NewBudgetDialog
        open={dialogOpen}
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
