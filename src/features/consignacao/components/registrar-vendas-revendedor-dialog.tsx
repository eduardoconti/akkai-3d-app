import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  ArrowForward,
  Close,
  CreditCard,
  Delete,
  LocalAtm,
  Pix,
  Remove,
} from '@mui/icons-material';
import {
  listarConsignacoes,
  listarTodosRevendedoresAtivos,
  obterConsignacaoPorId,
} from '@/features/consignacao/api/consignacao-api';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import { listWallets } from '@/features/finance/api/finance-api';
import { listAllProducts } from '@/features/products/api/products-api';
import { getPaymentMethodLabel } from '@/features/sales/utils/format-sale-labels';
import {
  CurrencyValue,
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  ProductAutocompleteField,
  useFeedbackStore,
  type Carteira,
  type Consignacao,
  type MeioPagamento,
  type Produto,
  type Revendedor,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface RegistrarVendasRevendedorDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

interface ItemVendaRevendedorFormState {
  idProduto: number | null;
  quantidade: string;
}

const itemInicial: ItemVendaRevendedorFormState = {
  idProduto: null,
  quantidade: '',
};

const todosMeiosPagamento: MeioPagamento[] = ['DIN', 'DEB', 'CRE', 'PIX'];
const opcoesPagamento = [
  { value: 'PIX' as MeioPagamento, label: 'Pix', icon: Pix },
  { value: 'DIN' as MeioPagamento, label: 'Dinheiro', icon: LocalAtm },
  { value: 'DEB' as MeioPagamento, label: 'Débito', icon: CreditCard },
  { value: 'CRE' as MeioPagamento, label: 'Crédito', icon: CreditCard },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="overline"
      sx={{
        display: 'block',
        mb: 1.25,
        color: 'text.secondary',
        fontWeight: 800,
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </Typography>
  );
}

function WalletToggleGroup({
  error,
  onChange,
  value,
  wallets,
}: {
  error?: string;
  onChange: (idCarteira: number) => void;
  value: number | '';
  wallets: Carteira[];
}) {
  const carteirasAtivas = wallets.filter((wallet) => wallet.ativa);

  return (
    <Stack spacing={0.75}>
      <Grid container spacing={1}>
        {carteirasAtivas.map((wallet) => {
          const isSelected = wallet.id === value;

          return (
            <Grid
              key={wallet.id}
              size={{
                xs:
                  carteirasAtivas.length === 1
                    ? 12
                    : carteirasAtivas.length >= 3
                      ? 4
                      : 6,
                sm:
                  carteirasAtivas.length === 1
                    ? 12
                    : carteirasAtivas.length >= 3
                      ? 4
                      : 6,
              }}
            >
              <Button
                fullWidth
                variant={isSelected ? 'contained' : 'outlined'}
                color={isSelected ? 'primary' : 'inherit'}
                onClick={() => onChange(wallet.id)}
                sx={{
                  minHeight: 44,
                  justifyContent: 'center',
                  textTransform: 'none',
                  px: 1,
                }}
              >
                {wallet.nome}
              </Button>
            </Grid>
          );
        })}
      </Grid>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}

function criarItemVazio(): ItemVendaRevendedorFormState {
  return { ...itemInicial };
}

async function listarIdsProdutosDisponiveisRevendedor(
  idRevendedor: number,
): Promise<Set<number>> {
  const consignacoes: Consignacao[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const resposta = await listarConsignacoes({
      pagina,
      tamanhoPagina: DEFAULT_PAGE_SIZE,
      termo: '',
      idRevendedor,
      status: 'ABERTA',
      ordenarPor: 'dataInclusao',
    });
    consignacoes.push(...resposta.itens);
    totalPaginas = resposta.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas);

  const detalhes = await Promise.all(
    consignacoes.map((consignacao) =>
      consignacao.itens ? consignacao : obterConsignacaoPorId(consignacao.id),
    ),
  );
  const idsProdutos = new Set<number>();

  detalhes.forEach((consignacao) => {
    (consignacao.itens ?? []).forEach((item) => {
      if (item.quantidadeDisponivel > 0) {
        idsProdutos.add(item.idProduto);
      }
    });
  });

  return idsProdutos;
}

export default function RegistrarVendasRevendedorDialog({
  open,
  onClose,
  onSaved,
}: RegistrarVendasRevendedorDialogProps) {
  const { isSubmitting, registrarVendasRevendedor, submitErrorMessage } =
    useConsignacaoStore(
      useShallow((state) => ({
        isSubmitting: consignacaoStoreSelectors.isSubmitting(state),
        registrarVendasRevendedor:
          consignacaoStoreSelectors.registrarVendasRevendedor(state),
        submitErrorMessage: consignacaoStoreSelectors.submitErrorMessage(state),
      })),
    );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [revendedor, setRevendedor] = useState<Revendedor | null>(null);
  const [idCarteira, setIdCarteira] = useState<number | ''>('');
  const [meioPagamento, setMeioPagamento] = useState<MeioPagamento | ''>('');
  const [itens, setItens] = useState<ItemVendaRevendedorFormState[]>([
    criarItemVazio(),
  ]);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [isLoadingDados, setIsLoadingDados] = useState(false);
  const [isLoadingProdutosRevendedor, setIsLoadingProdutosRevendedor] =
    useState(false);
  const [idsProdutosDisponiveis, setIdsProdutosDisponiveis] = useState<
    Set<number>
  >(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(true);

  const carteiraSelecionada = useMemo(
    () => carteiras.find((carteira) => carteira.id === idCarteira) ?? null,
    [carteiras, idCarteira],
  );
  const meiosPagamentoDisponiveis = useMemo(() => {
    if (
      !carteiraSelecionada ||
      carteiraSelecionada.meiosPagamento.length === 0
    ) {
      return todosMeiosPagamento;
    }

    return carteiraSelecionada.meiosPagamento;
  }, [carteiraSelecionada]);
  const produtosDisponiveisRevendedor = useMemo(() => {
    if (!revendedor) {
      return [];
    }

    return produtos.filter((produto) => idsProdutosDisponiveis.has(produto.id));
  }, [idsProdutosDisponiveis, produtos, revendedor]);
  const totais = useMemo(
    () =>
      itens.reduce(
        (totaisAtuais, item) => {
          const produto = produtos.find(
            (current) => current.id === item.idProduto,
          );
          const quantidade = Number(item.quantidade);

          if (!produto || !Number.isFinite(quantidade) || quantidade <= 0) {
            return totaisAtuais;
          }

          return {
            total: totaisAtuais.total + produto.valor * quantidade,
            quantidadeItens: totaisAtuais.quantidadeItens + quantidade,
          };
        },
        { total: 0, quantidadeItens: 0 },
      ),
    [itens, produtos],
  );
  const configSummary = [
    revendedor?.nome ?? 'sem revendedor',
    carteiraSelecionada?.nome ?? 'sem carteira',
    meioPagamento ? getPaymentMethodLabel(meioPagamento) : 'sem pagamento',
  ].join(' • ');
  const isBusy = isSubmitting || isSaving;
  const isLoadingProdutos = isLoadingDados || isLoadingProdutosRevendedor;

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setIsLoadingDados(true);

    Promise.all([
      listarTodosRevendedoresAtivos(),
      listAllProducts(),
      listWallets(),
    ])
      .then(([revendedoresResponse, produtosResponse, carteirasResponse]) => {
        if (!active) {
          return;
        }

        setRevendedores(revendedoresResponse);
        setProdutos(produtosResponse);
        setCarteiras(carteirasResponse.filter((carteira) => carteira.ativa));
      })
      .finally(() => {
        if (active) {
          setIsLoadingDados(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !revendedor) {
      setIdsProdutosDisponiveis(new Set());
      return;
    }

    let active = true;
    setIsLoadingProdutosRevendedor(true);

    listarIdsProdutosDisponiveisRevendedor(revendedor.id)
      .then((idsProdutos) => {
        if (!active) {
          return;
        }

        setIdsProdutosDisponiveis(idsProdutos);
        setItens((current) =>
          current.map((item) =>
            item.idProduto && !idsProdutos.has(item.idProduto)
              ? criarItemVazio()
              : item,
          ),
        );
      })
      .catch(() => {
        if (active) {
          setErroLocal('Não foi possível carregar os produtos do revendedor.');
          setIdsProdutosDisponiveis(new Set());
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingProdutosRevendedor(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, revendedor]);

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    setRevendedor(null);
    setIdCarteira('');
    setMeioPagamento('');
    setItens([criarItemVazio()]);
    setIdsProdutosDisponiveis(new Set());
    setErroLocal(null);
    setShowConfig(true);
    onClose();
  };

  const handleChangeRevendedor = (value: Revendedor | null) => {
    setRevendedor(value);
    setItens([criarItemVazio()]);
    setIdsProdutosDisponiveis(new Set());
    setErroLocal(null);
  };

  const handleChangeItem = (
    index: number,
    changes: Partial<ItemVendaRevendedorFormState>,
  ) => {
    setItens((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...changes } : item,
      ),
    );
  };

  const handleAddItem = () => {
    setItens((current) => [...current, criarItemVazio()]);
  };

  const handleChangeQuantidade = (index: number, quantidade: number) => {
    handleChangeItem(index, {
      quantidade:
        Number.isFinite(quantidade) && quantidade > 0
          ? String(Math.floor(quantidade))
          : '',
    });
  };

  const handleRemoveItem = (index: number) => {
    setItens((current) =>
      current.length === 1
        ? [criarItemVazio()]
        : current.filter((_item, currentIndex) => currentIndex !== index),
    );
  };

  const handleChangeCarteira = (idCarteiraSelecionada: number) => {
    const carteira = carteiras.find(
      (current) => current.id === idCarteiraSelecionada,
    );

    setIdCarteira(idCarteiraSelecionada);
    setMeioPagamento(carteira?.meiosPagamento[0] ?? '');
  };

  const validarFormulario = () => {
    if (!revendedor) {
      return 'Selecione o revendedor.';
    }

    if (produtosDisponiveisRevendedor.length === 0) {
      return 'O revendedor não possui produtos com saldo disponível em consignação.';
    }

    if (idCarteira === '') {
      return 'Selecione a carteira que receberá o pagamento.';
    }

    if (meioPagamento === '') {
      return 'Selecione o meio de pagamento.';
    }

    const itensValidos = itens.filter(
      (item) => item.idProduto !== null || item.quantidade.trim() !== '',
    );

    if (itensValidos.length === 0) {
      return 'Informe pelo menos um item vendido.';
    }

    const produtosInformados = new Set<number>();

    for (const item of itensValidos) {
      const quantidade = Number(item.quantidade);

      if (!item.idProduto) {
        return 'Selecione o produto vendido.';
      }

      if (!idsProdutosDisponiveis.has(item.idProduto)) {
        return 'Selecione um produto disponível nas consignações abertas do revendedor.';
      }

      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return 'As quantidades vendidas devem ser inteiras e maiores que zero.';
      }

      if (produtosInformados.has(item.idProduto)) {
        return 'A lista de vendas não pode repetir o mesmo produto.';
      }

      produtosInformados.add(item.idProduto);
    }

    return null;
  };

  const handleSubmit = async () => {
    const erro = validarFormulario();

    if (erro) {
      setErroLocal(erro);
      return;
    }

    if (!revendedor || idCarteira === '' || meioPagamento === '') {
      return;
    }

    setErroLocal(null);
    setIsSaving(true);

    try {
      const result = await registrarVendasRevendedor(revendedor.id, {
        idCarteira,
        meioPagamento,
        itens: itens
          .filter((item) => item.idProduto !== null)
          .map((item) => ({
            idProduto: item.idProduto as number,
            quantidade: Number(item.quantidade),
          })),
      });

      if (!result.success) {
        return;
      }

      await onSaved?.();
      showSuccess('Vendas do revendedor registradas com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={800}>
              Venda consignada rápida
            </Typography>
            <Button
              color="inherit"
              size="small"
              onClick={() => setShowConfig((current) => !current)}
              sx={{
                justifyContent: 'flex-start',
                minWidth: 0,
                px: 0,
                mt: 0.25,
                color: 'text.secondary',
                textTransform: 'none',
              }}
            >
              <Typography variant="body2" noWrap>
                {configSummary}
              </Typography>
            </Button>
          </Box>

          <IconButton
            onClick={handleClose}
            aria-label="Fechar modal de vendas por revendedor"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={2.5}>
          <FormFeedbackAlert message={erroLocal ?? submitErrorMessage} />

          <Collapse in={showConfig} unmountOnExit>
            <Paper elevation={2} sx={{ borderRadius: 2, p: 1.5 }}>
              <Stack spacing={1.5}>
                <Autocomplete
                  options={revendedores}
                  value={revendedor}
                  onChange={(_event, value) => handleChangeRevendedor(value)}
                  getOptionLabel={(option) => option.nome}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  loading={isLoadingDados}
                  disabled={isBusy || isLoadingDados}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Revendedor"
                      required
                    />
                  )}
                />

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ display: 'block', mb: 0.75 }}
                  >
                    Carteira
                  </Typography>
                  <WalletToggleGroup
                    value={idCarteira}
                    wallets={carteiras}
                    onChange={handleChangeCarteira}
                  />
                </Box>
              </Stack>
            </Paper>
          </Collapse>

          <Box>
            <SectionLabel>Itens vendidos</SectionLabel>

            {revendedor &&
            !isLoadingProdutosRevendedor &&
            produtosDisponiveisRevendedor.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                Este revendedor não possui produtos com saldo disponível em
                consignação.
              </Typography>
            ) : null}

            <Stack spacing={1.5}>
              {itens.map((item, index) => {
                const produto = produtos.find(
                  (current) => current.id === item.idProduto,
                );
                const quantidade = Number(item.quantidade);
                const subtotal =
                  produto && Number.isFinite(quantidade)
                    ? produto.valor * quantidade
                    : 0;

                return (
                  <Paper
                    key={`${index}-${item.idProduto ?? 'novo'}`}
                    elevation={2}
                    sx={{ borderRadius: 2, p: 1.5 }}
                  >
                    <Stack spacing={1.5}>
                      <Grid container spacing={1} alignItems="flex-start">
                        <Grid size={{ xs: 10, sm: 11 }}>
                          <ProductAutocompleteField
                            products={produtosDisponiveisRevendedor}
                            productId={item.idProduto}
                            onChange={(produtoSelecionado) =>
                              handleChangeItem(index, {
                                idProduto: produtoSelecionado?.id ?? null,
                                quantidade:
                                  produtoSelecionado && !item.quantidade
                                    ? '1'
                                    : item.quantidade,
                              })
                            }
                            label="Produto"
                            disabled={
                              isBusy || isLoadingProdutos || !revendedor
                            }
                            loading={isLoadingProdutos}
                            size="small"
                            required
                          />
                        </Grid>

                        <Grid size={{ xs: 2, sm: 1 }}>
                          <IconButton
                            aria-label="Remover item vendido"
                            onClick={() => handleRemoveItem(index)}
                            color="error"
                            disabled={itens.length === 1 || isBusy}
                            sx={{ mt: 0.25 }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Grid>
                      </Grid>

                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconButton
                            onClick={() =>
                              handleChangeQuantidade(
                                index,
                                Number(item.quantidade || 1) - 1,
                              )
                            }
                            disabled={
                              Number(item.quantidade || 0) <= 1 || isBusy
                            }
                            aria-label="Diminuir quantidade vendida"
                            sx={{
                              border: (theme) =>
                                `1px solid ${theme.palette.divider}`,
                              borderRadius: 1,
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>

                          <TextField
                            size="small"
                            type="number"
                            value={item.quantidade}
                            onChange={(event) =>
                              handleChangeQuantidade(
                                index,
                                Number(event.target.value),
                              )
                            }
                            disabled={isBusy}
                            inputProps={{
                              min: 1,
                              'aria-label': 'Quantidade vendida',
                            }}
                            sx={{
                              width: 72,
                              '& input': { textAlign: 'center' },
                            }}
                          />

                          <IconButton
                            onClick={() =>
                              handleChangeQuantidade(
                                index,
                                Number(item.quantidade || 0) + 1,
                              )
                            }
                            disabled={isBusy}
                            aria-label="Aumentar quantidade vendida"
                            sx={{
                              border: (theme) =>
                                `1px solid ${theme.palette.divider}`,
                              borderRadius: 1,
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                          <Typography variant="caption" color="text.secondary">
                            Total do item
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={800}>
                            <CurrencyValue value={subtotal} />
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}

              <Button
                startIcon={<Add />}
                onClick={handleAddItem}
                variant="outlined"
                disabled={
                  isBusy ||
                  isLoadingProdutos ||
                  !revendedor ||
                  produtosDisponiveisRevendedor.length === 0
                }
                sx={{
                  borderStyle: 'dashed',
                  py: 1.1,
                  justifyContent: 'center',
                }}
              >
                Adicionar item
              </Button>
            </Stack>
          </Box>

          <Box>
            <SectionLabel>Forma de pagamento</SectionLabel>

            <Grid container spacing={1}>
              {opcoesPagamento.map((option) => {
                const Icon = option.icon;
                const isSelected = meioPagamento === option.value;
                const isAvailable = meiosPagamentoDisponiveis.includes(
                  option.value,
                );

                return (
                  <Grid key={option.value} size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant={isSelected ? 'contained' : 'outlined'}
                      color={isSelected ? 'success' : 'inherit'}
                      disabled={!isAvailable || isBusy || idCarteira === ''}
                      onClick={() => setMeioPagamento(option.value)}
                      sx={{
                        height: 64,
                        flexDirection: 'column',
                        gap: 0.5,
                        textTransform: 'none',
                      }}
                    >
                      <Icon fontSize="small" />
                      {option.label}
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Stack>
      </DialogContent>

      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Total • {totais.quantidadeItens}{' '}
            {totais.quantidadeItens === 1 ? 'item' : 'itens'}
          </Typography>
          <Typography variant="h4" fontWeight={900} color="success.main">
            <CurrencyValue value={totais.total} />
          </Typography>
        </Box>

        <Button
          onClick={handleSubmit}
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          disabled={isBusy || isLoadingProdutos}
          sx={{ minWidth: { xs: 132, sm: 160 }, height: 56 }}
        >
          {isBusy ? 'Salvando...' : 'Finalizar'}
        </Button>
      </Box>
    </Dialog>
  );
}
