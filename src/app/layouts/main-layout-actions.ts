import { createContext, useContext } from 'react';

export interface MainLayoutActions {
  openNewProductDialog: () => void;
  openNewCategoryDialog: () => void;
  openNewBudgetDialog: () => void;
  openNewExpenseDialog: () => void;
  openNewWalletDialog: () => void;
  openWalletTransferDialog: () => void;
  openPaymentMethodWalletFeeDialog: () => void;
  openFairDialog: () => void;
  openNewPlanDialog: () => void;
  openNewAssinanteDialog: () => void;
  openNewCicloDialog: () => void;
  openNewKitDialog: () => void;
}

export const MainLayoutActionsContext =
  createContext<MainLayoutActions | null>(null);

export function useMainLayoutActions() {
  const actions = useContext(MainLayoutActionsContext);

  if (!actions) {
    throw new Error('useMainLayoutActions deve ser usado dentro do MainLayout.');
  }

  return actions;
}
