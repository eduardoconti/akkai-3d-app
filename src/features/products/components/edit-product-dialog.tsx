import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
  updateProductStatus,
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
  type StatusProduto,
} from '@/shared';
import { useAuth } from '@/features/auth';

const PERMISSAO_ALTERAR_STATUS_PRODUTO = 'produto.alterar-status';

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
  const {
    form,
    setForm,
    setInitialForm,
    problem,
    setProblem,
    localErrors,
    setLocalErrors,
    isSaving,
    setIsSaving,
    requestClose,
    discardChangesDialog,
  } = useFormDialog<ProductFormState, ProductFormErrors>({
    open,
    initialValues: initialProductFormState,
  });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productName, setProductName] = useState('');
  const [productStatus, setProductStatus] = useState<StatusProduto>('ATIVO');
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const { user } = useAuth();
  const podeAlterarStatus =
    user?.permissions.includes(PERMISSAO_ALTERAR_STATUS_PRODUTO) ?? false;

  const categoryOptions = useMemo(
    () => formatCategoryOptions(categorias),
    [categorias],
  );

  useEffect(() => {
    if (!open || productId === null) {
      setCategorias([]);
      setProductName('');
      setProductStatus('ATIVO');
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
        setProductStatus(product.status);
        setInitialForm({
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
  }, [open, productId, setInitialForm, setLocalErrors, setProblem]);

  const validateForm = (): ProductFormErrors => {
    const errors: ProductFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (
      form.codigo === '' ||
      !Number.isInteger(form.codigo) ||
      form.codigo < 1
    ) {
      errors.codigo = 'Informe um código numérico maior que zero.';
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
        codigo: Number(form.codigo),
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

  const handleChangeStatus = async () => {
    if (productId === null) {
      return;
    }

    const nextStatus: StatusProduto =
      productStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO';

    setIsChangingStatus(true);
    setProblem(null);

    try {
      const produto = await updateProductStatus(productId, nextStatus);
      setProductStatus(produto.status);
      await onUpdated();
      showSuccess(
        nextStatus === 'ATIVO'
          ? 'Produto ativado com sucesso.'
          : 'Produto inativado com sucesso.',
      );
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const getErrorMessage = (field: keyof ProductFormErrors | 'descricao') =>
    localErrors[field as keyof ProductFormErrors] ??
    getFieldMessage(problem, field) ??
    undefined;
  const isBusy = isLoading || isSaving || isChangingStatus;

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    requestClose(onClose);
  };

  const handleDialogDismiss = () => {
    if (isBusy) {
      return;
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogDismiss} fullWidth maxWidth="md">
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
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
            >
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
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {productName || 'Editar produto'}
                </Typography>
                <Chip
                  size="small"
                  label={productStatus === 'ATIVO' ? 'Ativo' : 'Inativo'}
                  color={productStatus === 'ATIVO' ? 'success' : 'default'}
                  variant={productStatus === 'ATIVO' ? 'filled' : 'outlined'}
                />
              </Stack>
              <Typography color="text.secondary">
                Ajuste nome, codigo, descricao, categoria, valor e estoque
                minimo.
              </Typography>
            </Box>
            <Stack spacing={3}>
              <FormFeedbackAlert message={problem?.detail} />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    label="Nome do Produto"
                    required
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
                    type="number"
                    label="Codigo"
                    required
                    value={form.codigo}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        codigo:
                          event.target.value === ''
                            ? ''
                            : Number(event.target.value),
                      }));
                    }}
                    error={Boolean(getErrorMessage('codigo'))}
                    helperText={getErrorMessage('codigo')}
                    inputProps={{ min: 1, step: 1 }}
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
                    helperText={getErrorMessage('estoqueMinimo')}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Categoria"
                    required
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
                    required
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

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          {podeAlterarStatus ? (
            <Button
              color={productStatus === 'ATIVO' ? 'warning' : 'success'}
              variant="outlined"
              onClick={handleChangeStatus}
              disabled={isBusy || productId === null}
            >
              {isChangingStatus
                ? 'Alterando...'
                : productStatus === 'ATIVO'
                  ? 'Inativar produto'
                  : 'Ativar produto'}
            </Button>
          ) : null}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={handleDialogClose} color="inherit" disabled={isBusy}>
            Cancelar
          </Button>

          <Button
            onClick={handleSaveProduct}
            variant="contained"
            startIcon={<Save />}
            disabled={isBusy}
          >
            {isSaving ? 'Salvando...' : 'Salvar cadastro'}
          </Button>
        </Box>
      </DialogActions>
      {discardChangesDialog}
    </Dialog>
  );
}
