import { Alert, Button, Snackbar } from '@mui/material';
import { useFeedbackStore } from '@/shared/lib/stores/use-feedback-store';

export default function GlobalFeedbackSnackbar() {
  const { action, close, message, open, severity } = useFeedbackStore();

  return (
    <Snackbar
      open={open}
      // Mais tempo quando há uma ação para dar chance de usá-la.
      autoHideDuration={action ? 8000 : severity === 'error' ? 6000 : 3500}
      onClose={(_, reason) => {
        if (reason === 'clickaway') {
          return;
        }

        close();
      }}
      // No topo, abaixo da barra: o rodapé é ocupado pela barra de atendimentos.
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ top: { xs: 104, md: 76 } }}
    >
      <Alert
        onClose={close}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
        action={
          action ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                action.onClick();
                close();
              }}
              sx={{ fontWeight: 700 }}
            >
              {action.label}
            </Button>
          ) : undefined
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
