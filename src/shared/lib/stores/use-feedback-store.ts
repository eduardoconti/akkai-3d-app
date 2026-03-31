import { create } from 'zustand';
import type { AlertColor } from '@mui/material';

interface FeedbackState {
  open: boolean;
  message: string;
  severity: AlertColor;
  showSuccess: (message: string) => void;
  close: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  open: false,
  message: '',
  severity: 'success',
  showSuccess: (message) => {
    set({
      open: true,
      message,
      severity: 'success',
    });
  },
  close: () => {
    set({ open: false });
  },
}));
