import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Typography,
  Box,
  Autocomplete,
  CircularProgress,
  InputAdornment,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Delete, Add, ShoppingCartCheckout } from '@mui/icons-material';
import { useProductStore } from '../store/useProductSotre';
import {
  useSaleStore,
  type InserirVendaInput,
  type MeioPagamento,
  type TipoVenda,
} from '../store/useSaleStore';
import MoneyInputCustom from './monei';
import { formatCurrency } from '../utils/moeda';

interface Props {
  open: boolean;
  onClose: () => void;
}

const emptyItem = { idProduto: 0, quantidade: 1, desconto: 0 };
const initialState: InserirVendaInput = {
  meioPagamento: 'PIX',
  tipo: 'FEIRA',
  desconto: 0,
  itens: [emptyItem],
};

export default function NovaVendaDialog({ open, onClose }: Props) {
  const { produtos, fetchProdutos, isLoading } = useProductStore();
  const { criarVenda, fetchVendas } = useSaleStore();
  const [form, setForm] = useState<InserirVendaInput>(initialState);

  useEffect(() => {
    if (!open) {
      setForm({
        ...initialState,
        itens: [{ ...emptyItem }],
      });
    } else if (produtos.length === 0) {
      fetchProdutos();
    }
  }, [open, produtos.length, fetchProdutos]);

  // ─── Totalizador ────────────────────────────────────────────────────────────
  const totais = useMemo(() => {
    let subtotal = 0;
    let descontosItens = 0;

    form.itens.forEach((item) => {
      const produto = produtos.find((p) => p.id === item.idProduto);
      // produto.preco já deve estar em centavos no store; ajuste se vier em reais
      const precoUnitario = produto?.valor ?? 0;
      subtotal += precoUnitario * item.quantidade;
      // item.desconto está em reais no formulário → converte para centavos
      descontosItens += (item.desconto ?? 0) * 100;
    });

    // form.desconto está em reais no formulário → converte para centavos
    const descontoVenda = (form.desconto ?? 0) * 100;
    const total = Math.max(0, subtotal - descontosItens - descontoVenda);

    return { subtotal, descontosItens, descontoVenda, total };
  }, [form, produtos]);
  // ────────────────────────────────────────────────────────────────────────────

  const handleAddItem = () =>
    setForm({
      ...form,
      itens: [...form.itens, { idProduto: 0, quantidade: 1, desconto: 0 }],
    });

  const handleRemoveItem = (index: number) =>
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== index) });

  const handleSubmit = async () => {
    if (form.itens.some((i) => i.idProduto === 0)) {
      alert('Selecione um produto para todos os itens');
      return;
    }

    const sucesso = await criarVenda({
      ...form,
      desconto: form.desconto ? form.desconto * 100 : 0,
      itens: form.itens.map((item) => ({
        ...item,
        desconto: item.desconto ? item.desconto * 100 : 0,
      })),
    });

    if (sucesso) {
      fetchVendas();
      onClose();
    } else {
      alert('Erro ao salvar venda. Verifique a conexão.');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 'bold' }}>Nova Venda Rápida</DialogTitle>

      <DialogContent dividers>
        {/* Cabeçalho */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Tipo de Venda"
              value={form.tipo}
              onChange={(e) =>
                setForm({ ...form, tipo: e.target.value as TipoVenda })
              }
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
              onChange={(e) =>
                setForm({
                  ...form,
                  meioPagamento: e.target.value as MeioPagamento,
                })
              }
            >
              <MenuItem value="DEB">Cartão débito</MenuItem>
              <MenuItem value="CRE">Cartão crédito</MenuItem>
              <MenuItem value="DIN">Dinheiro</MenuItem>
              <MenuItem value="PIX">Pix</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="desconto-valor"
              fullWidth
              label="Desconto na Venda (R$)"
              value={form.desconto}
              onChange={(e) =>
                setForm({ ...form, desconto: Number(e.target.value) })
              }
              onFocus={(e) => e.target.select()}
              name="desconto"
              InputProps={{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                inputComponent: MoneyInputCustom as any,
                startAdornment: (
                  <InputAdornment position="start">R$</InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Itens da Venda
        </Typography>

        {form.itens.map((item, index) => (
          <Box
            key={index}
            sx={{
              p: 2,
              mb: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              bgcolor: '#fcfcfc',
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 5 }}>
                <Autocomplete
                  id={`produto-select-${index}`}
                  disablePortal={false}
                  options={produtos}
                  getOptionLabel={(option) =>
                    `${option.nome} (${option.codigo})`
                  }
                  value={produtos.find((p) => p.id === item.idProduto) || null}
                  onChange={(_event, newValue) => {
                    const novos = [...form.itens];
                    novos[index].idProduto = newValue ? newValue.id : 0;
                    setForm({ ...form, itens: novos });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Produto"
                      variant="outlined"
                      fullWidth
                    />
                  )}
                  blurOnSelect
                  clearOnBlur={false}
                  ListboxProps={{ style: { maxHeight: '200px' } }}
                />
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Qtd"
                  type="number"
                  value={item.quantidade}
                  onChange={(e) => {
                    const novos = [...form.itens];
                    novos[index].quantidade = Number(e.target.value);
                    setForm({ ...form, itens: novos });
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Desconto Item (R$)"
                  value={item.desconto}
                  onChange={(e) => {
                    const novos = [...form.itens];
                    novos[index].desconto = Number(e.target.value);
                    setForm({ ...form, itens: novos });
                  }}
                  onFocus={(e) => e.target.select()}
                  name={`descontoItem-${index}`}
                  InputProps={{
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    inputComponent: MoneyInputCustom as any,
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
                  disabled={form.itens.length === 1}
                >
                  <Delete />
                </IconButton>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Button
          startIcon={<Add />}
          onClick={handleAddItem}
          variant="text"
          sx={{ mt: 1 }}
        >
          Adicionar outro produto
        </Button>
      </DialogContent>

      {/* ─── Rodapé com totalizador ─────────────────────────────────────────── */}
      <DialogActions sx={{ p: 0, display: 'block' }}>
        {/* Painel de totais */}
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ ml: 'auto' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Subtotal ({form.itens.length}{' '}
                  {form.itens.length === 1 ? 'item' : 'itens'})
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(totais.subtotal)}
                </Typography>
              </Box>

              {totais.descontosItens > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Descontos nos itens
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    − {formatCurrency(totais.descontosItens)}
                  </Typography>
                </Box>
              )}

              {totais.descontoVenda > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Desconto na venda
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    − {formatCurrency(totais.descontoVenda)}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1 }} />

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  Total
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {formatCurrency(totais.total)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Botões */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            px: 3,
            py: 2,
          }}
        >
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            startIcon={<ShoppingCartCheckout />}
          >
            Finalizar e Salvar
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
