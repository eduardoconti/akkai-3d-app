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
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Edit, Inventory2, Save, SwapHoriz } from '@mui/icons-material';
import {
  addProductStockEntry,
  addProductStockExit,
  getProductById,
  listCategories,
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
  type Categoria,
  type OrigemEntradaEstoque,
  type OrigemSaidaEstoque,
  type ProblemDetails,
} from '@/shared';

interface EditProductDialogProps {
  open: boolean;
  productId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

type MovementType = 'ENTRADA' | 'SAIDA';
type ModalTab = 'ESTOQUE' | 'CADASTRO';

type StockFormState = {
  tipo: MovementType;
  quantidade: number;
  origem: OrigemEntradaEstoque | OrigemSaidaEstoque;
};

const initialStockFormState: StockFormState = {
  tipo: 'ENTRADA',
  quantidade: 1,
  origem: 'COMPRA',
};

const entryOrigins: Array<{ value: OrigemEntradaEstoque; label: string }> = [
  { value: 'COMPRA', label: 'Compra' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'PRODUCAO', label: 'Producao' },
];

const exitOrigins: Array<{ value: OrigemSaidaEstoque; label: string }> = [
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'PERDA', label: 'Perda' },
];

export default function EditProductDialog({
  open,
  productId,
  onClose,
  onUpdated,
}: EditProductDialogProps) {
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [activeTab, setActiveTab] = useState<ModalTab>('ESTOQUE');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = useState<ProductFormState>(initialProductFormState);
  const [stockForm, setStockForm] = useState<StockFormState>(
    initialStockFormState,
  );
  const [productName, setProductName] = useState('');
  const [quantidadeEstoque, setQuantidadeEstoque] = useState<number | null>(null);
  const [estoqueMinimoAtual, setEstoqueMinimoAtual] = useState<number | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMovingStock, setIsMovingStock] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [stockProblem, setStockProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<ProductFormErrors>({});
  const [stockQuantityError, setStockQuantityError] = useState<string | null>(
    null,
  );

  const categoryOptions = useMemo(
    () => formatCategoryOptions(categorias),
    [categorias],
  );

  const movementOrigins = useMemo(
    () => (stockForm.tipo === 'ENTRADA' ? entryOrigins : exitOrigins),
    [stockForm.tipo],
  );

  const estoqueStatus = useMemo(() => {
    const estoqueAtual = quantidadeEstoque ?? 0;
    const estoqueMinimo = estoqueMinimoAtual;

    if (estoqueAtual < 0) {
      return {
        titulo: 'Estoque atual: CRITICO',
        descricao: `${estoqueAtual} unidades. Estoque negativo, ajuste necessario.`,
        sx: {
          bgcolor: 'error.dark',
          borderColor: 'error.main',
          color: 'error.contrastText',
          boxShadow: '0 12px 24px rgba(211, 47, 47, 0.28)',
        },
      };
    }

    if (estoqueMinimo !== null && estoqueAtual < estoqueMinimo) {
      return {
        titulo: 'Estoque atual: ABAIXO DO MINIMO',
        descricao: `${estoqueAtual} unidades. Minimo configurado: ${estoqueMinimo}.`,
        sx: {
          bgcolor: 'warning.light',
          borderColor: 'warning.main',
          color: 'warning.contrastText',
          boxShadow: '0 10px 20px rgba(237, 108, 2, 0.2)',
        },
      };
    }

    return {
      titulo: 'Estoque atual',
      descricao: `${estoqueAtual} unidades${estoqueMinimo !== null ? ` | Minimo: ${estoqueMinimo}` : ''}`,
      sx: {
        bgcolor: 'success.light',
        borderColor: 'success.main',
        color: 'success.contrastText',
        boxShadow: 'none',
      },
    };
  }, [estoqueMinimoAtual, quantidadeEstoque]);

  useEffect(() => {
    if (!open || productId === null) {
      setActiveTab('ESTOQUE');
      setCategorias([]);
      setForm(initialProductFormState);
      setStockForm(initialStockFormState);
      setProductName('');
      setQuantidadeEstoque(null);
      setEstoqueMinimoAtual(null);
      setProblem(null);
      setStockProblem(null);
      setLocalErrors({});
      setStockQuantityError(null);
      return;
    }

    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setProblem(null);
      setStockProblem(null);
      setLocalErrors({});
      setStockQuantityError(null);
      setActiveTab('ESTOQUE');

      try {
        const [product, categories] = await Promise.all([
          getProductById(productId),
          listCategories(),
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
        setQuantidadeEstoque(product.quantidadeEstoque);
        setEstoqueMinimoAtual(product.estoqueMinimo ?? null);
        setStockForm(initialStockFormState);
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

  const refreshProduct = async () => {
    if (productId === null) {
      return;
    }

    const product = await getProductById(productId);
    setProductName(product.nome);
    setForm({
      nome: product.nome,
      codigo: product.codigo,
      descricao: product.descricao ?? '',
      estoqueMinimo: product.estoqueMinimo ?? '',
      idCategoria: product.idCategoria,
      valor: product.valor / 100,
    });
    setQuantidadeEstoque(product.quantidadeEstoque);
    setEstoqueMinimoAtual(product.estoqueMinimo ?? null);
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
      setActiveTab('CADASTRO');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveStock = async () => {
    if (productId === null) {
      return;
    }

    setStockQuantityError(null);
    setStockProblem(null);

    if (stockForm.quantidade < 1) {
      setStockQuantityError('Informe uma quantidade de pelo menos 1 unidade.');
      return;
    }

    setIsMovingStock(true);

    try {
      if (stockForm.tipo === 'ENTRADA') {
        await addProductStockEntry(productId, {
          quantidade: stockForm.quantidade,
          origem: stockForm.origem as OrigemEntradaEstoque,
        });
      } else {
        await addProductStockExit(productId, {
          quantidade: stockForm.quantidade,
          origem: stockForm.origem as OrigemSaidaEstoque,
        });
      }

      await Promise.all([refreshProduct(), onUpdated()]);
      setStockForm(initialStockFormState);
      showSuccess('Estoque atualizado com sucesso.');
    } catch (error) {
      setStockProblem(getProblemDetailsFromError(error));
    } finally {
      setIsMovingStock(false);
    }
  };

  const getErrorMessage = (field: keyof ProductFormErrors | 'descricao') =>
    localErrors[field as keyof ProductFormErrors] ??
    getFieldMessage(problem, field) ??
    undefined;

  const movementActionLabel =
    stockForm.tipo === 'ENTRADA' ? 'Registrar entrada' : 'Registrar saida';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}
      >
        <Edit color="primary" /> Alterar produto
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
                Escolha se voce quer registrar uma movimentacao de estoque ou
                atualizar o cadastro do produto.
              </Typography>
            </Box>

            <Tabs
              value={activeTab}
              onChange={(_event, value: ModalTab) => setActiveTab(value)}
              variant="fullWidth"
            >
              <Tab
                icon={<Inventory2 fontSize="small" />}
                iconPosition="start"
                label="Estoque"
                value="ESTOQUE"
              />
              <Tab
                icon={<Edit fontSize="small" />}
                iconPosition="start"
                label="Cadastro"
                value="CADASTRO"
              />
            </Tabs>

            {activeTab === 'ESTOQUE' ? (
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography variant="h6" fontWeight={700}>
                    Estoque
                  </Typography>
                  <Typography color="text.secondary">
                    Consulte o saldo atual e registre entrada ou saida manual.
                  </Typography>

                  <Box
                    sx={{
                      border: '1px solid',
                      borderRadius: 3,
                      px: 2,
                      py: 1.5,
                      ...estoqueStatus.sx,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={800}>
                      {estoqueStatus.titulo}
                    </Typography>
                    <Typography variant="body2">
                      {estoqueStatus.descricao}
                    </Typography>
                  </Box>
                </Stack>

                <FormFeedbackAlert message={stockProblem?.detail} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Movimentacao"
                      value={stockForm.tipo}
                      onChange={(event) => {
                        const type = event.target.value as MovementType;
                        setStockForm({
                          tipo: type,
                          quantidade: 1,
                          origem: type === 'ENTRADA' ? 'COMPRA' : 'AJUSTE',
                        });
                      }}
                    >
                      <MenuItem value="ENTRADA">Entrada</MenuItem>
                      <MenuItem value="SAIDA">Saida</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Origem"
                      value={stockForm.origem}
                      onChange={(event) => {
                        setStockForm((current) => ({
                          ...current,
                          origem: event.target.value as
                            | OrigemEntradaEstoque
                            | OrigemSaidaEstoque,
                        }));
                      }}
                    >
                      {movementOrigins.map((origin) => (
                        <MenuItem key={origin.value} value={origin.value}>
                          {origin.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantidade"
                      value={stockForm.quantidade}
                      onChange={(event) => {
                        setStockForm((current) => ({
                          ...current,
                          quantidade: Number(event.target.value),
                        }));
                      }}
                      inputProps={{ min: 1, step: 1 }}
                      error={Boolean(stockQuantityError)}
                      helperText={stockQuantityError ?? ' '}
                    />
                  </Grid>
                </Grid>
              </Stack>
            ) : (
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
            )}
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>

        {activeTab === 'ESTOQUE' ? (
          <Button
            onClick={handleMoveStock}
            variant="contained"
            startIcon={<SwapHoriz />}
            disabled={isLoading || isMovingStock}
          >
            {isMovingStock ? 'Registrando...' : movementActionLabel}
          </Button>
        ) : (
          <Button
            onClick={handleSaveProduct}
            variant="contained"
            startIcon={<Save />}
            disabled={isLoading || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar cadastro'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
