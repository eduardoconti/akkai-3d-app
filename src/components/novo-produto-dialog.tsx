import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/Grid'; // O segredo está aqui
import { Save, Inventory } from '@mui/icons-material';
import { useProductStore } from '../store/useProductSotre';
import { formatarCategorias } from '../utils/categoria';
import MoneyInputCustom from './monei';
interface Props {
  open: boolean;
  onClose: () => void;
}

const initialState = {
  nome: '',
  codigo: '',
  descricao: '',
  idCategoria: 1, // Ajuste conforme sua categoria padrão
  valor: 0,
};

export default function NovoProdutoDialog({ open, onClose }: Props) {
  const { criarProduto, fetchProdutos, categorias, fetchCategorias } =
    useProductStore();

  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (open && categorias.length === 0) {
      fetchCategorias();
    }
  }, [open, categorias, fetchCategorias]);

  const handleSubmit = async () => {
    // Validação básica
    if (!form.nome || !form.codigo) {
      alert('Nome e Código são obrigatórios');
      return;
    }

    // Se o seu backend espera centavos (Ex: 6000 para R$ 60,00),
    // multiplicamos por 100 aqui se você digitar o valor real.
    const bodyParaEnvio = {
      ...form,
      valor: Math.round(form.valor * 100),
    };

    const sucesso = await criarProduto(bodyParaEnvio);
    if (sucesso) {
      fetchProdutos();
      onClose();
    } else {
      alert('Erro ao cadastrar produto.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Inventory color="primary" /> Novo Produto
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              id="prod-nome"
              fullWidth
              label="Nome do Produto"
              value={form.nome}
              onChange={(e) =>
                setForm({ ...form, nome: e.target.value.toUpperCase() })
              }
              placeholder="Ex: STEGOUSSAURO BRILHA"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              id="prod-codigo"
              fullWidth
              label="Código/SKU"
              value={form.codigo}
              onChange={(e) =>
                setForm({ ...form, codigo: e.target.value.toUpperCase() })
              }
              placeholder="DINO02"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              id="prod-desc"
              fullWidth
              multiline
              rows={2}
              label="Descrição"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              id="prod-cat"
              select
              fullWidth
              label="Categoria"
              value={form.idCategoria}
              onChange={(e) =>
                setForm({ ...form, idCategoria: Number(e.target.value) })
              }
            >
              {formatarCategorias(categorias).map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              id="prod-valor"
              fullWidth
              label="Valor de Venda"
              value={form.valor}
              onChange={(e) =>
                setForm({ ...form, valor: Number(e.target.value) })
              }
              onFocus={(e) => e.target.select()} // SEGREDO: Seleciona tudo ao clicar
              name="valor"
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
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          size="large"
        >
          Salvar Produto
        </Button>
      </DialogActions>
    </Dialog>
  );
}
