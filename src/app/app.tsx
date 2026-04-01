import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import MainLayout from './layouts/main-layout';
import { LoginPage, ProtectedRoute } from '@/features/auth';
import { ProductsPage } from '@/features/products';
import { ReportsSummaryPage } from '@/features/reports';
import { SalesPage } from '@/features/sales';

function ProtectedLayout() {
  return (
    <MainLayout>
      <Outlet />
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
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/relatorios/resumo" element={<ReportsSummaryPage />} />
            <Route path="/vendas" element={<SalesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
