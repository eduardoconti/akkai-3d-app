import ReactDOM from 'react-dom/client';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { App } from '@/app';
import { AuthProvider } from '@/features/auth';
import { ThemeModeProvider } from '@/theme/theme-mode-context';
import '@/index.css';
import 'dayjs/locale/pt-br';

declare global {
  interface Window {
    __AKKAI_PRODUCTS__?: Array<{ id: number; valor: number; nome: string }>;
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <ThemeModeProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <App />
      </LocalizationProvider>
    </ThemeModeProvider>
  </AuthProvider>,
);
