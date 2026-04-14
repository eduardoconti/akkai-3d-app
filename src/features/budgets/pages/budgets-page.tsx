import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import NewBudgetDialog from '@/features/budgets/components/new-budget-dialog';
import {
  budgetStoreSelectors,
  useBudgetStore,
} from '@/features/budgets/store/use-budget-store';
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
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Orçamentos
          </Typography>
          <Typography color="text.secondary">
            Registre e acompanhe solicitações de orçamento dos clientes.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Novo orçamento
        </Button>
      </Stack>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de orçamentos">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
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
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhum orçamento cadastrado até o momento.
              </Box>
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
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
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
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      Nenhum orçamento cadastrado até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalItens}
          page={Math.max(0, paginacao.pagina - 1)}
          onPageChange={(_event, newPage) => {
            void fetchOrcamentos({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacao.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchOrcamentos({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Itens por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          sx={{
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' },
              gap: 1,
              px: { xs: 1, sm: 2 },
            },
          }}
        />
      </Paper>

      <NewBudgetDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
}
