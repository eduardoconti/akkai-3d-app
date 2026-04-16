import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
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
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import NewBudgetDialog from '@/features/budgets/components/new-budget-dialog';
import {
  budgetStoreSelectors,
  useBudgetStore,
} from '@/features/budgets/store/use-budget-store';
import {
  ALL_STATUSES_ORCAMENTO,
  STATUS_ORCAMENTO_LABEL,
} from '@/features/budgets/types/budget-form';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
} from '@/shared';
import type { Orcamento, StatusOrcamento, TipoVenda } from '@/shared/lib/types/domain';
import { useShallow } from 'zustand/react/shallow';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR');
}

function formatCurrency(valueInCents: number): string {
  return (valueInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const STATUS_COLOR: Record<
  StatusOrcamento,
  'default' | 'warning' | 'info' | 'success' | 'primary'
> = {
  PENDENTE: 'warning',
  AGUARDANDO_APROVACAO: 'info',
  APROVADO: 'success',
  PRODUZIDO: 'primary',
  FINALIZADO: 'default',
};

const TIPO_LABEL: Record<TipoVenda, string> = {
  FEIRA: 'Feira',
  LOJA: 'Loja',
  ONLINE: 'Online',
};

interface StatusChipProps {
  orcamento: Orcamento;
  onStatusChange: (id: number, status: StatusOrcamento) => void;
  disabled?: boolean;
}

function StatusChip({ orcamento, onStatusChange, disabled }: StatusChipProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Chip
        label={STATUS_ORCAMENTO_LABEL[orcamento.status]}
        color={STATUS_COLOR[orcamento.status]}
        size="small"
        clickable={!disabled}
        onClick={disabled ? undefined : (e) => setAnchor(e.currentTarget)}
      />
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {ALL_STATUSES_ORCAMENTO.map((status) => (
          <MenuItem
            key={status}
            selected={orcamento.status === status}
            onClick={() => {
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

  useEffect(() => {
    void fetchOrcamentos();
  }, [fetchOrcamentos]);

  const handleStatusChange = (id: number, status: StatusOrcamento) => {
    void atualizarOrcamento(id, { status });
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Orçamentos"
        description="Registre e acompanhe solicitações de orçamento dos clientes."
        actionLabel="Novo orçamento"
        onAction={() => setDialogOpen(true)}
      />

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de orçamentos">
            {isFetching ? (
              <LoadingState />
            ) : orcamentos.length > 0 ? (
              orcamentos.map((orcamento) => (
                <Box key={orcamento.id} sx={{ px: 2, py: 2 }}>
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

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <StatusChip
                        orcamento={orcamento}
                        onStatusChange={handleStatusChange}
                        disabled={isSubmitting}
                      />
                      <Chip
                        label={TIPO_LABEL[orcamento.tipo]}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

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
                          Valor: {formatCurrency(orcamento.valor)}
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
                        <Link href={orcamento.linkSTL} target="_blank" rel="noreferrer">
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
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : orcamentos.length > 0 ? (
                  orcamentos.map((orcamento) => (
                    <TableRow key={orcamento.id}>
                      <TableCell>#{orcamento.id}</TableCell>
                      <TableCell>{orcamento.nomeCliente}</TableCell>
                      <TableCell>{orcamento.telefoneCliente ?? '-'}</TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            {TIPO_LABEL[orcamento.tipo]}
                          </Typography>
                          {orcamento.tipo === 'FEIRA' && orcamento.feira ? (
                            <Typography variant="caption" color="text.secondary">
                              {orcamento.feira.nome}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          orcamento={orcamento}
                          onStatusChange={handleStatusChange}
                          disabled={isSubmitting}
                        />
                      </TableCell>
                      <TableCell>
                        {orcamento.valor != null ? formatCurrency(orcamento.valor) : '-'}
                      </TableCell>
                      <TableCell>{orcamento.quantidade ?? '-'}</TableCell>
                      <TableCell>{formatDateTime(orcamento.dataInclusao)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0 }}>
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

      <NewBudgetDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
}
