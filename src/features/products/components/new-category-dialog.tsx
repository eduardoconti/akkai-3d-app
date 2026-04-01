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
import { Category, Save } from '@mui/icons-material';
import { formatCategoryOptions } from '../utils/format-category-options';
import { useProductStore } from '../store/use-product-store';
import {
  initialCategoryFormState,
  type CategoryFormErrors,
  type CategoryFormState,
} from '../types/category-form';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

interface NewCategoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewCategoryDialog({
  open,
  onClose,
}: NewCategoryDialogProps) {
  const {
    categorias,
    criarCategoria,
    submitErrorMessage,
    fetchCategorias,
    isFetchingCategories,
    isSubmitting,
    clearSubmitError,
  } = useProductStore();

  const [form, setForm] = useState<CategoryFormState>(initialCategoryFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<CategoryFormErrors>({});
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (open) {
      void fetchCategorias();
      return;
    }

    setForm(initialCategoryFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
  }, [open, fetchCategorias, clearSubmitError]);

  const categoryOptions = useMemo(
    () => formatCategoryOptions(categorias),
    [categorias],
  );

  const validateForm = (): CategoryFormErrors => {
    const errors: CategoryFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    return errors;
  };

  const handleClose = () => {
    setForm(initialCategoryFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
    onClose();
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    setLocalErrors(validationErrors);
    setProblem(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const result = await criarCategoria({
      nome: form.nome.trim().toUpperCase(),
      idAscendente: form.idAscendente === '' ? undefined : form.idAscendente,
    });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    await fetchCategorias();
    showSuccess('Categoria cadastrada com sucesso.');
    handleClose();
  };

  const globalMessage = problem?.detail ?? submitErrorMessage;
  const getErrorMessage = (field: keyof CategoryFormErrors) =>
    localErrors[field] ?? getFieldMessage(problem, field) ?? undefined;

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
        <Category color="primary" /> Nova Categoria
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={globalMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nome da Categoria"
              placeholder="Ex: CHAVEIROS"
              value={form.nome}
              onChange={(event) => {
                setForm((current) => ({ ...current, nome: event.target.value }));
              }}
              error={Boolean(getErrorMessage('nome'))}
              helperText={getErrorMessage('nome')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              select
              fullWidth
              label="Categoria pai"
              value={form.idAscendente}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  idAscendente:
                    event.target.value === '' ? '' : Number(event.target.value),
                }));
              }}
              helperText="Opcional. Use se esta categoria fizer parte de outra."
              disabled={isFetchingCategories}
            >
              <MenuItem value="">Sem categoria pai</MenuItem>
              {categoryOptions.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.label}
                </MenuItem>
              ))}
            </TextField>
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
          {isSubmitting ? 'Salvando...' : 'Salvar Categoria'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
