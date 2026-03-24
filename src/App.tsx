import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import MainLayout from './components/main-layout';
import BasicTable from './pages/product-table';
import SalesTable from './pages/sales-table';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          {/* Rota de Produtos */}
          <Route path="/produtos" element={<BasicTable />} />

          {/* Rota de Vendas */}
          <Route path="/vendas" element={<SalesTable />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
