import { Alert, Snackbar } from '@mui/material';
import { useFeedbackStore } from '@/shared/lib/stores/use-feedback-store';

export default function GlobalFeedbackSnackbar() {
  const { close, message, open, severity } = useFeedbackStore();

  return (
    <Snackbar
      open={open}
      autoHideDuration={3500}
      onClose={(_, reason) => {
        if (reason === 'clickaway') {
          return;
        }

        close();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={close}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
