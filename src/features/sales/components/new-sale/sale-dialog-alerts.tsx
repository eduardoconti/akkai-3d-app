import { Alert } from '@mui/material';
import { FormFeedbackAlert } from '@/shared';
import type { BudgetNotice } from './use-budget-total-reconciliation';

interface SaleDialogAlertsProps {
  globalMessage?: string | null;
  hasNoFairs: boolean;
  hasNoWallets: boolean;
  isEditMode: boolean;
  isOnline: boolean;
  isCaixaFromCache?: boolean;
  /** Aviso sobre o ajuste do total ao valor do orçamento finalizado. */
  budgetNotice?: BudgetNotice | null;
}

export default function SaleDialogAlerts({
  globalMessage,
  hasNoFairs,
  hasNoWallets,
  isEditMode,
  isOnline,
  isCaixaFromCache = false,
  budgetNotice = null,
}: SaleDialogAlertsProps) {
  return (
    <>
      <FormFeedbackAlert message={globalMessage} />

      {!isOnline && !isEditMode ? (
        <Alert severity="info">
          Você está offline. As vendas serão salvas localmente e poderão ser
          sincronizadas depois.
        </Alert>
      ) : null}

      {budgetNotice ? (
        <Alert severity={budgetNotice.severity}>{budgetNotice.text}</Alert>
      ) : null}

      {isCaixaFromCache && !isEditMode ? (
        <Alert severity="info">
          Caixa da feira carregado do último acesso. O servidor confirma que ele
          ainda está aberto quando a venda for sincronizada.
        </Alert>
      ) : null}

      {!isOnline && isEditMode ? (
        <Alert severity="warning">
          A edição de vendas está disponível apenas quando houver conexão com a
          internet.
        </Alert>
      ) : null}

      {hasNoFairs ? (
        <Alert severity="info">
          Nenhuma feira cadastrada até o momento. Cadastre uma feira antes de
          registrar vendas desse tipo.
        </Alert>
      ) : null}

      {hasNoWallets ? (
        <Alert severity="info">
          Nenhuma carteira cadastrada até o momento. Cadastre uma carteira para
          registrar vendas.
        </Alert>
      ) : null}
    </>
  );
}
