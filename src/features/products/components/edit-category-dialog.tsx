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
import {
  getCategoryById,
  updateCategory,
} from '../api/products-api';
import { formatCategoryOptions } from '../utils/format-category-options';
import {
  initialCategoryFormState,
  type CategoryFormErrors,
  type CategoryFormState,
} from '../types/category-form';
import { useProductStore } from '../store/use-product-store';
import {
  FormFeedbackAlert,
  getFieldMessage,
  getProblemDetailsFromError,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

interface EditCategoryDialogProps {
  open: boolean;
  categoryId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditCategoryDialog({
  open,
  categoryId,
  onClose,
  onUpdated,
}: EditCategoryDialogProps) {
  const { categorias, fetchCategorias, isFetchingCategories } = useProductStore();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [form, setForm] = useState<CategoryFormState>(initialCategoryFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<CategoryFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || categoryId === null) {
      setForm(initialCategoryFormState);
      setProblem(null);
      setLocalErrors({});
      return;
    }

    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const [category] = await Promise.all([
          getCategoryById(categoryId),
          fetchCategorias(),
        ]);

        if (!active) {
          return;
        }

        setForm({
          nome: category.nome,
          idAscendente: category.idAscendente ?? '',
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [categoryId, fetchCategorias, open]);

  const categoryOptions = useMemo(
    () =>
      formatCategoryOptions(categorias).filter(
        (category) => category.id !== categoryId,
      ),
    [categorias, categoryId],
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
    onClose();
  };

  const handleSubmit = async () => {
    if (categoryId === null) {
      return;
    }

    const errors = validateForm();
    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      await updateCategory(categoryId, {
        nome: form.nome.trim().toUpperCase(),
        idAscendente: form.idAscendente === '' ? undefined : form.idAscendente,
      });

      await onUpdated();
      showSuccess('Categoria alterada com sucesso.');
      handleClose();
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
    } finally {
      setIsSaving(false);
    }
  };

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
        <Category color="primary" /> Alterar categoria
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nome da categoria"
              placeholder="Ex: CHAVEIROS"
              value={form.nome}
              disabled={isLoading}
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
              disabled={isLoading || isFetchingCategories}
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
        <Button onClick={handleClose} color="inherit" disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isSaving || isLoading}
        >
          {isSaving ? 'Salvando...' : 'Salvar categoria'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
