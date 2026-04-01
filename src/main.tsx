import ReactDOM from 'react-dom/client';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { App } from '@/app';
import { AuthProvider } from '@/features/auth';
import { ThemeModeProvider } from '@/theme/theme-mode-context';
import '@/index.css';
import 'dayjs/locale/pt-br';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <ThemeModeProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <App />
      </LocalizationProvider>
    </ThemeModeProvider>
  </AuthProvider>,
);
