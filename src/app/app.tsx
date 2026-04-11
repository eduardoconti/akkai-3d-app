import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import RouteErrorBoundary from './components/route-error-boundary';
import MainLayout from './layouts/main-layout';
import { LoginPage, ProtectedRoute } from '@/features/auth';

const SalesPage = lazy(() => import('@/features/sales/pages/sales-page'));
const FinanceWalletsPage = lazy(
  () => import('@/features/finance/pages/finance-wallets-page'),
);
const FinanceExpenseCategoriesPage = lazy(
  () => import('@/features/finance/pages/finance-expense-categories-page'),
);
const FinanceExpensesPage = lazy(
  () => import('@/features/finance/pages/finance-expenses-page'),
);
const BudgetsPage = lazy(() => import('@/features/budgets/pages/budgets-page'));
const ProductsPage = lazy(() => import('@/features/products/pages/products-page'));
const ProductsStockPage = lazy(
  () => import('@/features/products/pages/products-stock-page'),
);
const ProductCategoriesPage = lazy(
  () => import('@/features/products/pages/product-categories-page'),
);
const ReportsBestSellingProductsPage = lazy(
  () => import('@/features/reports/pages/reports-best-selling-products-page'),
);
const ReportsStockValuePage = lazy(
  () => import('@/features/reports/pages/reports-stock-value-page'),
);
const ReportsSummaryPage = lazy(
  () => import('@/features/reports/pages/reports-summary-page'),
);

function RouteFallback() {
  return (
    <Box
      sx={{
        minHeight: '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
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
            <Route path="/" element={<Navigate to="/vendas" replace />} />
            <Route path="/financeiro/carteiras" element={<FinanceWalletsPage />} />
            <Route
              path="/financeiro/categorias-despesa"
              element={<FinanceExpenseCategoriesPage />}
            />
            <Route path="/financeiro/despesas" element={<FinanceExpensesPage />} />
            <Route path="/orcamentos" element={<BudgetsPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/produtos/estoque" element={<ProductsStockPage />} />
            <Route path="/produtos/categorias" element={<ProductCategoriesPage />} />
            <Route
              path="/relatorios/produtos-mais-vendidos"
              element={<ReportsBestSellingProductsPage />}
            />
            <Route
              path="/relatorios/valor-produtos-estoque"
              element={<ReportsStockValuePage />}
            />
            <Route path="/relatorios/resumo" element={<ReportsSummaryPage />} />
            <Route path="/vendas" element={<SalesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
