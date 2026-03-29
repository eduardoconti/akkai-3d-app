import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Delete, ShoppingCartCheckout } from '@mui/icons-material';
import { useProductStore } from '../store/useProductStore';
import {
  useSaleStore,
  type MeioPagamento,
  type TipoVenda,
} from '../store/useSaleStore';
import MoneyInput from '../shared/components/money-input';
import { formatCurrency } from '../utils/moeda';
import { getFieldMessage } from '../shared/utils/problem';
import type { ProblemDetails } from '../shared/types/problem-details';

type VendaFormItem = {
  idProduto: number | null;
  quantidade: number;
  desconto: number;
};

type VendaFormState = {
  meioPagamento: MeioPagamento;
  tipo: TipoVenda;
  idFeira: number | '';
  desconto: number;
  itens: VendaFormItem[];
};

type VendaLocalErrors = {
  idFeira?: string;
  itens?: string;
};

type VendaItemErrors = Array<{
  idProduto?: string;
  quantidade?: string;
  desconto?: string;
}>;

interface Props {
  open: boolean;
  onClose: () => void;
}

const emptyItem: VendaFormItem = { idProduto: null, quantidade: 1, desconto: 0 };
const initialState: VendaFormState = {
  meioPagamento: 'PIX',
  tipo: 'FEIRA',
  idFeira: '',
  desconto: 0,
  itens: [{ ...emptyItem }],
};

export default function NovaVendaDialog({ open, onClose }: Props) {
  const {
    fetchErrorMessage: productFetchErrorMessage,
    fetchProdutos,
    isFetching: isFetchingProducts,
    produtos,
  } = useProductStore();
  const {
    criarVenda,
    fetchErrorMessage: saleFetchErrorMessage,
    feiras,
    fetchFeiras,
    fetchVendas,
    isFetching: isFetchingSales,
    isSubmitting,
    submitErrorMessage,
    clearSubmitError,
  } = useSaleStore();

  const [form, setForm] = useState<VendaFormState>(initialState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<VendaLocalErrors>({});
  const [itemErrors, setItemErrors] = useState<VendaItemErrors>([]);

  useEffect(() => {
    if (open) {
      void fetchProdutos();
      void fetchFeiras();
      return;
    }

    setForm(initialState);
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    clearSubmitError();
  }, [open, fetchFeiras, fetchProdutos, clearSubmitError]);

  const totais = useMemo(() => {
    let subtotal = 0;
    let descontosItens = 0;

    form.itens.forEach((item) => {
      const produto = produtos.find((current) => current.id === item.idProduto);
      const valorUnitario = produto?.valor ?? 0;
      subtotal += valorUnitario * item.quantidade;
      descontosItens += Math.round((item.desconto ?? 0) * 100);
    });

    const descontoVenda = Math.round((form.desconto ?? 0) * 100);

    return {
      subtotal,
      descontosItens,
      descontoVenda,
      total: Math.max(0, subtotal - descontosItens - descontoVenda),
    };
  }, [form, produtos]);

  const handleClose = () => {
    setForm(initialState);
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    clearSubmitError();
    onClose();
  };

  const handleAddItem = () => {
    setForm((current) => ({
      ...current,
      itens: [...current.itens, { ...emptyItem }],
    }));
    setItemErrors((current) => [...current, {}]);
  };

  const handleRemoveItem = (index: number) => {
    setForm((current) => ({
      ...current,
      itens: current.itens.filter((_, currentIndex) => currentIndex !== index),
    }));
    setItemErrors((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const validateForm = () => {
    const nextLocalErrors: VendaLocalErrors = {};
    const nextItemErrors: VendaItemErrors = form.itens.map((item) => {
      const errors: VendaItemErrors[number] = {};

      if (!item.idProduto) {
        errors.idProduto = 'Selecione um produto.';
      }

      if (item.quantidade < 1) {
        errors.quantidade = 'Informe uma quantidade de pelo menos 1 unidade.';
      }

      if (item.desconto < 0) {
        errors.desconto = 'O desconto do item não pode ser negativo.';
      }

      return errors;
    });

    if (form.tipo === 'FEIRA' && form.idFeira === '') {
      nextLocalErrors.idFeira = 'Selecione a feira em que a venda aconteceu.';
    }

    if (form.itens.length === 0) {
      nextLocalErrors.itens = 'Adicione ao menos um item na venda.';
    }

    return { nextLocalErrors, nextItemErrors };
  };

  const handleSubmit = async () => {
    const { nextLocalErrors, nextItemErrors } = validateForm();
    setLocalErrors(nextLocalErrors);
    setItemErrors(nextItemErrors);
    setProblem(null);

    const hasItemErrors = nextItemErrors.some(
      (item) => Object.keys(item).length > 0,
    );

    if (Object.keys(nextLocalErrors).length > 0 || hasItemErrors) {
      return;
    }

    const result = await criarVenda({
      meioPagamento: form.meioPagamento,
      tipo: form.tipo,
      idFeira: form.idFeira === '' ? undefined : form.idFeira,
      desconto: Math.round(form.desconto * 100),
      itens: form.itens.map((item) => ({
        idProduto: item.idProduto ?? 0,
        quantidade: item.quantidade,
        desconto: Math.round(item.desconto * 100),
      })),
    });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    await fetchVendas();
    handleClose();
  };

  const isFetching = isFetchingProducts || isFetchingSales;
  const globalMessage =
    problem?.detail ?? submitErrorMessage ?? saleFetchErrorMessage ?? productFetchErrorMessage;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>Nova Venda Rápida</DialogTitle>

      <DialogContent dividers>
        {globalMessage ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {globalMessage}
          </Alert>
        ) : null}

        {form.tipo === 'FEIRA' && feiras.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Nenhuma feira cadastrada até o momento. Cadastre uma feira no backend
            antes de registrar vendas desse tipo.
          </Alert>
        ) : null}

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Tipo de Venda"
              value={form.tipo}
              onChange={(event) => {
                const tipo = event.target.value as TipoVenda;
                setForm((current) => ({
                  ...current,
                  tipo,
                  idFeira: tipo === 'FEIRA' ? current.idFeira : '',
                }));
              }}
            >
              <MenuItem value="FEIRA">Feira</MenuItem>
              <MenuItem value="LOJA">Loja</MenuItem>
              <MenuItem value="ONLINE">Online</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Meio de Pagamento"
              value={form.meioPagamento}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  meioPagamento: event.target.value as MeioPagamento,
                }));
              }}
            >
              <MenuItem value="DEB">Cartão débito</MenuItem>
              <MenuItem value="CRE">Cartão crédito</MenuItem>
              <MenuItem value="DIN">Dinheiro</MenuItem>
              <MenuItem value="PIX">Pix</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Desconto na Venda (R$)"
              value={form.desconto}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  desconto: Number(event.target.value),
                }));
              }}
              onFocus={(event) => event.target.select()}
              name="desconto"
              error={Boolean(getFieldMessage(problem, 'desconto'))}
              helperText={getFieldMessage(problem, 'desconto')}
              InputProps={{
                inputComponent: MoneyInput,
                startAdornment: (
                  <InputAdornment position="start">R$</InputAdornment>
                ),
              }}
            />
          </Grid>

          {form.tipo === 'FEIRA' ? (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Feira"
                value={form.idFeira}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    idFeira:
                      event.target.value === '' ? '' : Number(event.target.value),
                  }));
                }}
                error={Boolean(localErrors.idFeira || getFieldMessage(problem, 'idFeira'))}
                helperText={
                  localErrors.idFeira ?? getFieldMessage(problem, 'idFeira')
                }
              >
                <MenuItem value="">Selecione uma feira</MenuItem>
                {feiras.map((feira) => (
                  <MenuItem key={feira.id} value={feira.id}>
                    {feira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          ) : null}
        </Grid>

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
          Itens da Venda
        </Typography>

        {localErrors.itens ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {localErrors.itens}
          </Alert>
        ) : null}

        {form.itens.map((item, index) => (
          <Box
            key={`${index}-${item.idProduto ?? 'novo'}`}
            sx={{
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              p: 2,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 5 }}>
                <Autocomplete
                  options={produtos}
                  getOptionLabel={(option) => `${option.nome} (${option.codigo})`}
                  value={produtos.find((produto) => produto.id === item.idProduto) ?? null}
                  loading={isFetching}
                  onChange={(_event, newValue) => {
                    setForm((current) => {
                      const itens = [...current.itens];
                      itens[index] = {
                        ...itens[index],
                        idProduto: newValue?.id ?? null,
                      };
                      return { ...current, itens };
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Produto"
                      error={Boolean(
                        itemErrors[index]?.idProduto ||
                          getFieldMessage(problem, `itens[${index}].idProduto`),
                      )}
                      helperText={
                        itemErrors[index]?.idProduto ??
                        getFieldMessage(problem, `itens[${index}].idProduto`)
                      }
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Qtd"
                  type="number"
                  value={item.quantidade}
                  onChange={(event) => {
                    setForm((current) => {
                      const itens = [...current.itens];
                      itens[index] = {
                        ...itens[index],
                        quantidade: Number(event.target.value),
                      };
                      return { ...current, itens };
                    });
                  }}
                  error={Boolean(
                    itemErrors[index]?.quantidade ||
                      getFieldMessage(problem, `itens[${index}].quantidade`),
                  )}
                  helperText={
                    itemErrors[index]?.quantidade ??
                    getFieldMessage(problem, `itens[${index}].quantidade`)
                  }
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Desconto Item (R$)"
                  value={item.desconto}
                  onChange={(event) => {
                    setForm((current) => {
                      const itens = [...current.itens];
                      itens[index] = {
                        ...itens[index],
                        desconto: Number(event.target.value),
                      };
                      return { ...current, itens };
                    });
                  }}
                  onFocus={(event) => event.target.select()}
                  name={`descontoItem-${index}`}
                  error={Boolean(
                    itemErrors[index]?.desconto ||
                      getFieldMessage(problem, `itens[${index}].desconto`),
                  )}
                  helperText={
                    itemErrors[index]?.desconto ??
                    getFieldMessage(problem, `itens[${index}].desconto`)
                  }
                  InputProps={{
                    inputComponent: MoneyInput,
                    startAdornment: (
                      <InputAdornment position="start">R$</InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 2, sm: 1 }}>
                <IconButton
                  onClick={() => handleRemoveItem(index)}
                  color="error"
                  disabled={form.itens.length === 1 || isSubmitting}
                >
                  <Delete />
                </IconButton>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Button startIcon={<Add />} onClick={handleAddItem} variant="text" sx={{ mt: 1 }}>
          Adicionar outro produto
        </Button>
      </DialogContent>

      <DialogActions sx={{ display: 'block', p: 0 }}>
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ ml: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal ({form.itens.length} {form.itens.length === 1 ? 'item' : 'itens'})
                </Typography>
                <Typography variant="body2">{formatCurrency(totais.subtotal)}</Typography>
              </Box>

              {totais.descontosItens > 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Descontos nos itens
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    - {formatCurrency(totais.descontosItens)}
                  </Typography>
                </Box>
              ) : null}

              {totais.descontoVenda > 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Desconto na venda
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    - {formatCurrency(totais.descontoVenda)}
                  </Typography>
                </Box>
              ) : null}

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Total
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {formatCurrency(totais.total)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            startIcon={<ShoppingCartCheckout />}
            disabled={isSubmitting || isFetching}
          >
            {isSubmitting ? 'Salvando...' : 'Finalizar e Salvar'}
          </Button>
        </Box>
      </DialogActions>

      {isFetching ? (
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <CircularProgress size={20} />
        </Box>
      ) : null}
    </Dialog>
  );
}
