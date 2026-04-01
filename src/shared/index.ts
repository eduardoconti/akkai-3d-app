export { default as GlobalFeedbackSnackbar } from './components/feedback/global-feedback-snackbar';
export { default as DatePickerField } from './components/form/date-picker-field';
export { default as CurrencyField } from './components/form/currency-field';
export { default as FormFeedbackAlert } from './components/form/form-feedback-alert';
export { default as MoneyInput } from './components/inputs/money-input';
export {
  httpClient,
  ApiProblemError,
  getProblemDetailsFromError,
} from './lib/api/http-client';
export { useFeedbackStore } from './lib/stores/use-feedback-store';
export type { ActionResult } from './lib/types/action-result';
export type {
  Carteira,
  CarteiraInput,
  CategoriaDespesa,
  Categoria,
  DetalheProduto,
  Despesa,
  DespesaInput,
  EstoqueInput,
  Feira,
  InserirVendaInput,
  InserirVendaItemInput,
  MeioPagamento,
  OrigemEntradaEstoque,
  OrigemSaidaEstoque,
  PesquisaPaginadaDespesas,
  Produto,
  ProdutoInput,
  PesquisaPaginada,
  PesquisaPaginadaVendas,
  ResultadoPaginado,
  TipoVenda,
  Venda,
  VendaItem,
} from './lib/types/domain';
export type {
  ProblemDetails,
  ProblemValidationItem,
} from './lib/types/problem-details';
export { getFieldMessage, getFieldMessages } from './lib/utils/problem';
export { formatCurrency } from './utils/format-currency';
