import { createContext } from 'react';
import type { PaletteMode } from '@mui/material';

export interface ThemeModeContextValue {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

export const ThemeModeContext = createContext<
  ThemeModeContextValue | undefined
>(undefined);
