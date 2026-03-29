import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './components/main-layout';
import ProductTablePage from './pages/product-table';
import SalesTablePage from './pages/sales-table';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/vendas" replace />} />
          <Route path="/produtos" element={<ProductTablePage />} />
          <Route path="/vendas" element={<SalesTablePage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
