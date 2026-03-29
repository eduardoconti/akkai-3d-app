import { Alert, type AlertColor } from '@mui/material';

interface FormFeedbackAlertProps {
  message?: string | null;
  severity?: AlertColor;
}

export default function FormFeedbackAlert({
  message,
  severity = 'error',
}: FormFeedbackAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <Alert severity={severity} sx={{ mb: 3 }}>
      {message}
    </Alert>
  );
}
