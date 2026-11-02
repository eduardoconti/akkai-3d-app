import { create } from 'zustand';
import type { AlertColor } from '@mui/material';

export interface FeedbackAction {
  label: string;
  onClick: () => void;
}

interface FeedbackState {
  open: boolean;
  message: string;
  severity: AlertColor;
  action: FeedbackAction | null;
  showSuccess: (message: string, action?: FeedbackAction) => void;
  showError: (message: string) => void;
  close: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  open: false,
  message: '',
  severity: 'success',
  action: null,
  showSuccess: (message, action) => {
    set({
      open: true,
      message,
      severity: 'success',
      action: action ?? null,
    });
  },
  showError: (message) => {
    set({
      open: true,
      message,
      severity: 'error',
      action: null,
    });
  },
  close: () => {
    set({ open: false });
  },
}));
