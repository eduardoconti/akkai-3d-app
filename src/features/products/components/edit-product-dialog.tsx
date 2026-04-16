import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, Edit, Save } from '@mui/icons-material';
import {
  getProductById,
  listAllCategories,
  updateProduct,
} from '../api/products-api';
import { formatCategoryOptions } from '../utils/format-category-options';
import {
  initialProductFormState,
  type ProductFormErrors,
  type ProductFormState,
} from '../types/product-form';
import {
  CurrencyField,
  FormFeedbackAlert,
  getFieldMessage,
  getProblemDetailsFromError,
  useFeedbackStore,
  useFormDialog,
  type Categoria,
} from '@/shared';

interface EditProductDialogProps {
  open: boolean;
  productId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditProductDialog({
  open,
  productId,
  onClose,
  onUpdated,
}: EditProductDialogProps) {
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving } =
    useFormDialog<ProductFormState, ProductFormErrors>({
      open,
      initialValues: initialProductFormState,
    });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productName, setProductName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categoryOptions = useMemo(
    () => formatCategoryOptions(categorias),
    [categorias],
  );

  useEffect(() => {
    if (!open || productId === null) {
      setCategorias([]);
      setProductName('');
      return;
    }

    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const [product, categories] = await Promise.all([
          getProductById(productId),
          listAllCategories(),
        ]);

        if (!active) {
          return;
        }

        setCategorias(categories);
        setProductName(product.nome);
        setForm({
          nome: product.nome,
          codigo: product.codigo,
          descricao: product.descricao ?? '',
          estoqueMinimo: product.estoqueMinimo ?? '',
          idCategoria: product.idCategoria,
          valor: product.valor / 100,
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
  }, [open, productId]);

  const validateForm = (): ProductFormErrors => {
    const errors: ProductFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.codigo.trim().length < 2) {
      errors.codigo = 'Informe um codigo com pelo menos 2 caracteres.';
    }

    if (form.idCategoria === '') {
      errors.idCategoria = 'Selecione uma categoria.';
    }

    if (form.valor < 0.5) {
      errors.valor = 'Informe um valor de pelo menos R$ 0,50.';
    }

    if (form.estoqueMinimo !== '' && form.estoqueMinimo < 0) {
      errors.estoqueMinimo = 'O estoque minimo nao pode ser negativo.';
    }

    return errors;
  };

  const handleSaveProduct = async () => {
    if (productId === null) {
      return;
    }

    const validationErrors = validateForm();
    setLocalErrors(validationErrors);
    setProblem(null);

    if (Object.keys(validationErrors).length > 0 || form.idCategoria === '') {
      return;
    }

    setIsSaving(true);

    try {
      await updateProduct(productId, {
        nome: form.nome.trim().toUpperCase(),
        codigo: form.codigo.trim().toUpperCase(),
        descricao: form.descricao.trim() || undefined,
        estoqueMinimo:
          form.estoqueMinimo === '' ? undefined : form.estoqueMinimo,
        idCategoria: form.idCategoria,
        valor: Math.round(form.valor * 100),
      });

      await onUpdated();
      showSuccess('Cadastro do produto alterado com sucesso.');
      onClose();
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const getErrorMessage = (field: keyof ProductFormErrors | 'descricao') =>
    localErrors[field as keyof ProductFormErrors] ??
    getFieldMessage(problem, field) ??
    undefined;
  const isBusy = isLoading || isSaving;

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ px: 3, py: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Edit color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Alterar produto
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Atualize os dados cadastrais do produto selecionado.
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de produto"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {productName || 'Editar produto'}
              </Typography>
              <Typography color="text.secondary">
                Ajuste nome, codigo, descricao, categoria, valor e estoque minimo.
              </Typography>
            </Box>
            <Stack spacing={3}>
              <FormFeedbackAlert message={problem?.detail} />

              <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      fullWidth
                      label="Nome do Produto"
                      value={form.nome}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          nome: event.target.value,
                        }));
                      }}
                      error={Boolean(getErrorMessage('nome'))}
                      helperText={getErrorMessage('nome')}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      label="Codigo/SKU"
                      value={form.codigo}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          codigo: event.target.value,
                        }));
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
                      label="Descricao"
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

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Estoque minimo"
                      value={form.estoqueMinimo}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          estoqueMinimo:
                            event.target.value === ''
                              ? ''
                              : Number(event.target.value),
                        }));
                      }}
                      inputProps={{ min: 0, step: 1 }}
                      error={Boolean(getErrorMessage('estoqueMinimo'))}
                      helperText={
                        getErrorMessage('estoqueMinimo') ??
                        'Opcional. Usado para destacar quando o saldo estiver baixo.'
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Categoria"
                      value={form.idCategoria}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          idCategoria:
                            event.target.value === ''
                              ? ''
                              : Number(event.target.value),
                        }));
                      }}
                      error={Boolean(getErrorMessage('idCategoria'))}
                      helperText={getErrorMessage('idCategoria')}
                    >
                      <MenuItem value="">Selecione uma categoria</MenuItem>
                      {categoryOptions.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
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
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>

        <Button
          onClick={handleSaveProduct}
          variant="contained"
          startIcon={<Save />}
          disabled={isLoading || isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar cadastro'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
