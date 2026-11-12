import { Suspense, lazy } from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import RouteErrorBoundary from './components/route-error-boundary';
import MainLayout from './layouts/main-layout';
import NotFoundPage from './not-found-page';
import {
  LoginPage,
  PERMISSAO_ADMINISTRAR_PERMISSOES,
  ProtectedRoute,
  RequirePermission,
} from '@/features/auth';

const UserPermissionsPage = lazy(
  () => import('@/features/auth/pages/user-permissions-page'),
);
const SalesPage = lazy(() => import('@/features/sales/pages/sales-page'));
const FairsPage = lazy(() => import('@/features/sales/pages/fairs-page'));
const FairProductPricesPage = lazy(
  () => import('@/features/sales/pages/fair-product-prices-page'),
);
const FinanceWalletsPage = lazy(
  () => import('@/features/finance/pages/finance-wallets-page'),
);
const FinanceCashRegistersPage = lazy(
  () => import('@/features/finance/pages/finance-cash-registers-page'),
);
const FinanceExpenseCategoriesPage = lazy(
  () => import('@/features/finance/pages/finance-expense-categories-page'),
);
const FinanceExpensesPage = lazy(
  () => import('@/features/finance/pages/finance-expenses-page'),
);
const FinancePaymentMethodWalletFeesPage = lazy(
  () =>
    import('@/features/finance/pages/finance-payment-method-wallet-fees-page'),
);
const FinanceWalletTransfersPage = lazy(
  () => import('@/features/finance/pages/finance-wallet-transfers-page'),
);
const BudgetsPage = lazy(() => import('@/features/budgets/pages/budgets-page'));
const ProductsPage = lazy(
  () => import('@/features/products/pages/products-page'),
);
const ProductCategoriesPage = lazy(
  () => import('@/features/products/pages/product-categories-page'),
);
const ProductStockMovementsPage = lazy(
  () => import('@/features/products/pages/product-stock-movements-page'),
);
const ReportsBestSellingProductsPage = lazy(
  () => import('@/features/reports/pages/reports-best-selling-products-page'),
);
const ReportsStockValuePage = lazy(
  () => import('@/features/reports/pages/reports-stock-value-page'),
);
const ReportsProductionPage = lazy(
  () => import('@/features/reports/pages/reports-production-page'),
);
const ReportsProductionSuggestionPage = lazy(
  () => import('@/features/reports/pages/reports-production-suggestion-page'),
);
const ReportsSummaryPage = lazy(
  () => import('@/features/reports/pages/reports-summary-page'),
);
const DashboardHomePage = lazy(
  () => import('@/features/reports/pages/dashboard-home-page'),
);
const PlanosPage = lazy(
  () => import('@/features/assinatura/pages/planos-page'),
);
const AssinantesPage = lazy(
  () => import('@/features/assinatura/pages/assinantes-page'),
);
const CiclosPage = lazy(
  () => import('@/features/assinatura/pages/ciclos-page'),
);
const KitsPage = lazy(() => import('@/features/assinatura/pages/kits-page'));
const ConsignacoesPage = lazy(
  () => import('@/features/consignacao/pages/consignacoes-page'),
);
const RevendedoresPage = lazy(
  () => import('@/features/consignacao/pages/revendedores-page'),
);

function RouteFallback() {
  return (
    <Stack spacing={3} aria-busy="true" aria-label="Carregando página">
      <Box>
        <Skeleton variant="text" width={220} sx={{ fontSize: '2rem' }} />
        <Skeleton variant="text" width={340} />
      </Box>
      <Skeleton variant="rounded" height={110} />
      <Skeleton variant="rounded" height={320} />
    </Stack>
  );
}

function ProtectedLayout() {
  return (
    <MainLayout>
      <RouteErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </MainLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardHomePage />} />
            <Route
              path="/financeiro/carteiras"
              element={<FinanceWalletsPage />}
            />
            <Route
              path="/financeiro/caixas"
              element={<FinanceCashRegistersPage />}
            />
            <Route
              path="/financeiro/categorias-despesa"
              element={<FinanceExpenseCategoriesPage />}
            />
            <Route
              path="/financeiro/taxas-meio-pagamento-carteira"
              element={<FinancePaymentMethodWalletFeesPage />}
            />
            <Route
              path="/financeiro/despesas"
              element={<FinanceExpensesPage />}
            />
            <Route
              path="/financeiro/transferencias"
              element={<FinanceWalletTransfersPage />}
            />
            <Route path="/orcamentos" element={<BudgetsPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route
              path="/produtos/categorias"
              element={<ProductCategoriesPage />}
            />
            <Route
              path="/produtos/movimentacoes"
              element={<ProductStockMovementsPage />}
            />
            <Route
              path="/relatorios/produtos-mais-vendidos"
              element={<ReportsBestSellingProductsPage />}
            />
            <Route
              path="/relatorios/valor-produtos-estoque"
              element={<ReportsStockValuePage />}
            />
            <Route
              path="/relatorios/producao"
              element={<ReportsProductionPage />}
            />
            <Route
              path="/relatorios/sugestao-producao"
              element={<ReportsProductionSuggestionPage />}
            />
            <Route path="/relatorios/resumo" element={<ReportsSummaryPage />} />
            <Route
              path="/vendas/precos-feira"
              element={<FairProductPricesPage />}
            />
            <Route path="/vendas/feiras" element={<FairsPage />} />
            <Route path="/vendas" element={<SalesPage />} />
            <Route path="/consignacao" element={<ConsignacoesPage />} />
            <Route
              path="/consignacao/revendedores"
              element={<RevendedoresPage />}
            />
            <Route path="/assinatura/planos" element={<PlanosPage />} />
            <Route path="/assinatura/assinantes" element={<AssinantesPage />} />
            <Route path="/assinatura/ciclos" element={<CiclosPage />} />
            <Route path="/assinatura/kits" element={<KitsPage />} />
            <Route
              path="/administracao/permissoes"
              element={
                <RequirePermission
                  permission={PERMISSAO_ADMINISTRAR_PERMISSOES}
                >
                  <UserPermissionsPage />
                </RequirePermission>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
