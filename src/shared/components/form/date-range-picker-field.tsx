import { useId, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Popover,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  type TextFieldProps,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { CalendarMonth } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface DateRangePickerFieldProps {
  id?: string;
  label: string;
  startValue: string;
  endValue: string;
  onValueChange: (value: { startValue: string; endValue: string }) => void;
  slotProps?: {
    textField?: TextFieldProps;
  };
}

function formatDate(value: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY') : '';
}

function getTodayRange() {
  const today = dayjs().format('YYYY-MM-DD');

  return {
    startValue: today,
    endValue: today,
  };
}

function getWeekRange() {
  return {
    startValue: dayjs().day(0).format('YYYY-MM-DD'),
    endValue: dayjs().format('YYYY-MM-DD'),
  };
}

function getMonthRange() {
  return {
    startValue: dayjs().date(1).format('YYYY-MM-DD'),
    endValue: dayjs().format('YYYY-MM-DD'),
  };
}

export default function DateRangePickerField({
  id,
  label,
  startValue,
  endValue,
  onValueChange,
  slotProps,
}: DateRangePickerFieldProps) {
  const generatedId = useId();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const formattedValue = useMemo(() => {
    if (!startValue && !endValue) {
      return '';
    }

    if (startValue === endValue) {
      return formatDate(startValue);
    }

    return `${formatDate(startValue)} até ${formatDate(endValue)}`;
  }, [endValue, startValue]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStartChange = (value: string) => {
    if (!value) {
      return;
    }

    if (!endValue || dayjs(value).isAfter(dayjs(endValue), 'day')) {
      onValueChange({
        startValue: value,
        endValue: value,
      });
      return;
    }

    onValueChange({
      startValue: value,
      endValue,
    });
  };

  const handleEndChange = (value: string) => {
    if (!value) {
      return;
    }

    if (!startValue || dayjs(value).isBefore(dayjs(startValue), 'day')) {
      onValueChange({
        startValue: value,
        endValue: value,
      });
      return;
    }

    onValueChange({
      startValue,
      endValue: value,
    });
  };

  const handleQuickSelect = (range: {
    startValue: string;
    endValue: string;
  }) => {
    onValueChange(range);
  };

  const content = (
    <Stack
      spacing={2.5}
      sx={{ p: isMobile ? 0 : 2, width: { xs: '100%', md: 760 } }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          Atalhos
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleQuickSelect(getTodayRange())}
          >
            Hoje
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleQuickSelect(getWeekRange())}
          >
            Semana
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleQuickSelect(getMonthRange())}
          >
            Mês
          </Button>
        </Stack>
      </Stack>

      <Divider />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              Data inicial
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'center',
                py: 1,
              }}
            >
              <DateCalendar
                value={startValue ? dayjs(startValue) : dayjs()}
                onChange={(nextValue) => {
                  handleStartChange(nextValue?.format('YYYY-MM-DD') ?? '');
                }}
              />
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              Data final
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'center',
                py: 1,
              }}
            >
              <DateCalendar
                value={endValue ? dayjs(endValue) : dayjs()}
                onChange={(nextValue) => {
                  handleEndChange(nextValue?.format('YYYY-MM-DD') ?? '');
                }}
              />
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
      >
        <Typography variant="body2" color="text.secondary">
          {formattedValue || 'Selecione o período'}
        </Typography>

        <Button variant="contained" onClick={handleClose}>
          Concluir
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <>
      <TextField
        id={id ?? generatedId}
        fullWidth
        label={label}
        value={formattedValue}
        onClick={handleOpen}
        placeholder="Selecione o período"
        InputLabelProps={{
          shrink: true,
        }}
        InputProps={{
          readOnly: true,
          startAdornment: (
            <CalendarMonth fontSize="small" color="action" sx={{ mr: 1 }} />
          ),
        }}
        inputProps={{
          'aria-label': label,
        }}
        sx={{
          '& .MuiInputBase-input': {
            cursor: 'pointer',
          },
        }}
        {...(slotProps?.textField ?? {})}
      />

      {isMobile ? (
        <Dialog
          open={Boolean(anchorEl)}
          onClose={handleClose}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>{label}</DialogTitle>
          <DialogContent>{content}</DialogContent>
        </Dialog>
      ) : (
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          {content}
        </Popover>
      )}
    </>
  );
}
