import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Inventory, Save } from '@mui/icons-material';
import { formatCategoryOptions } from '../utils/format-category-options';
import { useProductStore } from '../store/use-product-store';
import {
  initialProductFormState,
  type ProductFormErrors,
  type ProductFormState,
} from '../types/product-form';
import {
  CurrencyField,
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

interface NewProductDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewProductDialog({
  open,
  onClose,
}: NewProductDialogProps) {
  const {
    categorias,
    criarProduto,
    submitErrorMessage,
    fetchCategorias,
    fetchProdutos,
    isFetchingCategories,
    isSubmitting,
    clearSubmitError,
  } = useProductStore();

  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [form, setForm] = useState<ProductFormState>(initialProductFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<ProductFormErrors>({});

  useEffect(() => {
    if (open) {
      void fetchCategorias();
      return;
    }

    setForm(initialProductFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
  }, [open, fetchCategorias, clearSubmitError]);

  const categoryOptions = useMemo(
    () => formatCategoryOptions(categorias),
    [categorias],
  );

  const validateForm = (): ProductFormErrors => {
    const errors: ProductFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.codigo.trim().length < 2) {
      errors.codigo = 'Informe um código com pelo menos 2 caracteres.';
    }

    if (form.idCategoria === '') {
      errors.idCategoria = 'Selecione uma categoria.';
    }

    if (form.valor < 0.5) {
      errors.valor = 'Informe um valor de pelo menos R$ 0,50.';
    }

    return errors;
  };

  const handleClose = () => {
    setForm(initialProductFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
    onClose();
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    setLocalErrors(validationErrors);
    setProblem(null);

    if (Object.keys(validationErrors).length > 0 || form.idCategoria === '') {
      return;
    }

    const result = await criarProduto({
      nome: form.nome.trim().toUpperCase(),
      codigo: form.codigo.trim().toUpperCase(),
      descricao: form.descricao.trim() || undefined,
      idCategoria: form.idCategoria,
      valor: Math.round(form.valor * 100),
    });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    await fetchProdutos();
    showSuccess('Produto cadastrado com sucesso.');
    handleClose();
  };

  const getErrorMessage = (field: keyof ProductFormErrors | 'descricao') =>
    localErrors[field as keyof ProductFormErrors] ??
    getFieldMessage(problem, field) ??
    undefined;

  const globalMessage = problem?.detail ?? submitErrorMessage;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontWeight: 700,
        }}
      >
        <Inventory color="primary" /> Novo Produto
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={globalMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              label="Nome do Produto"
              placeholder="Ex: Stegossauro Brilha"
              value={form.nome}
              onChange={(event) => {
                setForm((current) => ({ ...current, nome: event.target.value }));
              }}
              error={Boolean(getErrorMessage('nome'))}
              helperText={getErrorMessage('nome')}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Código/SKU"
              placeholder="DINO02"
              value={form.codigo}
              onChange={(event) => {
                setForm((current) => ({ ...current, codigo: event.target.value }));
              }}
              error={Boolean(getErrorMessage('codigo'))}
              helperText={getErrorMessage('codigo')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Descrição"
              value={form.descricao}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  descricao: event.target.value,
                }));
              }}
              error={Boolean(getErrorMessage('descricao'))}
              helperText={getErrorMessage('descricao')}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Categoria"
              value={form.idCategoria}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  idCategoria:
                    event.target.value === '' ? '' : Number(event.target.value),
                }));
              }}
              error={Boolean(getErrorMessage('idCategoria'))}
              helperText={getErrorMessage('idCategoria')}
              disabled={isFetchingCategories}
            >
              <MenuItem value="">Selecione uma categoria</MenuItem>
              {categoryOptions.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyField
              fullWidth
              label="Valor de Venda"
              value={form.valor}
              onValueChange={(valor) => {
                setForm((current) => ({ ...current, valor }));
              }}
              name="valor"
              error={Boolean(getErrorMessage('valor'))}
              helperText={getErrorMessage('valor')}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
