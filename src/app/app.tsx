import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/main-layout';
import { ProductsPage } from '@/features/products';
import { ReportsSummaryPage } from '@/features/reports';
import { SalesPage } from '@/features/sales';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/vendas" replace />} />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/relatorios/resumo" element={<ReportsSummaryPage />} />
          <Route path="/vendas" element={<SalesPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
