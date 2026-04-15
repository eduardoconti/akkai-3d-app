import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Divider,
  Link,
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
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR');
}

export default function BudgetsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    fetchErrorMessage,
    fetchOrcamentos,
    isFetching,
    orcamentos,
    paginacao,
    totalItens,
  } = useBudgetStore(
    useShallow((state) => ({
      fetchErrorMessage: budgetStoreSelectors.fetchErrorMessage(state),
      fetchOrcamentos: budgetStoreSelectors.fetchOrcamentos(state),
      isFetching: budgetStoreSelectors.isFetching(state),
      orcamentos: budgetStoreSelectors.orcamentos(state),
      paginacao: budgetStoreSelectors.paginacao(state),
      totalItens: budgetStoreSelectors.totalItens(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void fetchOrcamentos();
  }, [fetchOrcamentos]);

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
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(orcamento.dataInclusao)}
                      </Typography>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Telefone: {orcamento.telefoneCliente}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Descrição: {orcamento.descricao || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      STL:{' '}
                      {orcamento.linkSTL ? (
                        <Link href={orcamento.linkSTL} target="_blank" rel="noreferrer">
                          Abrir link
                        </Link>
                      ) : (
                        '-'
                      )}
                    </Typography>
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
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Link STL</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Data de inclusão</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : orcamentos.length > 0 ? (
                  orcamentos.map((orcamento) => (
                    <TableRow key={orcamento.id}>
                      <TableCell>#{orcamento.id}</TableCell>
                      <TableCell>{orcamento.nomeCliente}</TableCell>
                      <TableCell>{orcamento.telefoneCliente}</TableCell>
                      <TableCell>{orcamento.descricao || '-'}</TableCell>
                      <TableCell>
                        {orcamento.linkSTL ? (
                          <Link href={orcamento.linkSTL} target="_blank" rel="noreferrer">
                            Abrir link
                          </Link>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(orcamento.dataInclusao)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0 }}>
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
