import { useId, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import type { PickersCalendarHeaderProps } from '@mui/x-date-pickers/PickersCalendarHeader';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  type TextFieldProps,
} from '@mui/material';
import {
  CalendarMonth,
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import type { DateRangeValue } from '@/shared/utils/date-range';

interface DateRangePickerFieldProps {
  id?: string;
  label: string;
  startValue: string;
  endValue: string;
  onValueChange: (value: DateRangeValue) => void;
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

const weekDayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function RangeCalendarHeader({
  currentMonth,
  disabled,
  onMonthChange,
}: PickersCalendarHeaderProps) {
  const currentMonthValue = dayjs(currentMonth).locale('pt-br');

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 2, pt: 1.5, pb: 1 }}
    >
      <Typography variant="subtitle1" fontWeight={500}>
        {currentMonthValue.format('MMMM YYYY')}
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={() => onMonthChange(currentMonthValue.subtract(1, 'month'))}
          aria-label="Mês anterior"
        >
          <KeyboardArrowLeft />
        </IconButton>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={() => onMonthChange(currentMonthValue.add(1, 'month'))}
          aria-label="Próximo mês"
        >
          <KeyboardArrowRight />
        </IconButton>
      </Stack>
    </Stack>
  );
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
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

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

  const handleCalendarChange = (value: string) => {
    if (!value) {
      return;
    }

    if (selectionStep === 'start' || !startValue) {
      onValueChange({
        startValue: value,
        endValue: value,
      });
      setSelectionStep('end');
      return;
    }

    if (dayjs(value).isBefore(dayjs(startValue), 'day')) {
      onValueChange({
        startValue: value,
        endValue: startValue,
      });
    } else {
      onValueChange({
        startValue,
        endValue: value,
      });
    }

    setSelectionStep('start');
  };

  const handleQuickSelect = (range: DateRangeValue) => {
    onValueChange(range);
    setSelectionStep('start');
  };

  const handleClear = () => {
    onValueChange({
      startValue: '',
      endValue: '',
    });
    setSelectionStep('start');
  };

  const selectedCalendarValue = useMemo(() => {
    if (selectionStep === 'end' && endValue) {
      return dayjs(endValue);
    }

    return startValue ? dayjs(startValue) : dayjs();
  }, [endValue, selectionStep, startValue]);

  const RangeDay = (props: PickersDayProps) => {
    const { day, outsideCurrentMonth, ...other } = props;
    const currentDay = dayjs(day);
    const startDay = startValue ? dayjs(startValue) : null;
    const endDay = endValue ? dayjs(endValue) : null;
    const isStart = Boolean(startDay) && currentDay.isSame(startDay, 'day');
    const isEnd = Boolean(endDay) && currentDay.isSame(endDay, 'day');
    const isBetween =
      Boolean(startDay) &&
      Boolean(endDay) &&
      currentDay.isAfter(startDay, 'day') &&
      currentDay.isBefore(endDay, 'day');
    const isHighlighted =
      !outsideCurrentMonth && (isStart || isEnd || isBetween);
    const isSingleDayRange = isStart && isEnd;
    const hasRangeFill = isHighlighted && !isSingleDayRange;

    return (
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 36,
          mx: 0,
          ...(hasRangeFill
            ? {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: isStart ? '50%' : 0,
                  right: isEnd ? '50%' : 0,
                  height: 30,
                  transform: 'translateY(-50%)',
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                },
              }
            : {}),
        }}
      >
        <PickersDay
          {...other}
          day={day}
          outsideCurrentMonth={outsideCurrentMonth}
          disableMargin
          selected={!outsideCurrentMonth && (isStart || isEnd)}
          sx={{
            position: 'relative',
            zIndex: 1,
            borderRadius: '50%',
            ...(isBetween
              ? {
                  bgcolor: 'transparent',
                  color: 'text.primary',
                  '&:hover, &:focus': {
                    bgcolor: alpha(theme.palette.primary.main, 0.28),
                  },
                }
              : {}),
          }}
        />
      </Box>
    );
  };

  const content = (
    <Stack
      spacing={2}
      sx={{ p: isMobile ? 0 : 2, width: { xs: '100%', sm: 360 } }}
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

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ minHeight: 54 }}
      >
        <Box sx={{ minWidth: 0, textAlign: 'center' }}>
          <Typography
            variant="caption"
            color={
              selectionStep === 'start' ? 'primary.main' : 'text.secondary'
            }
          >
            Início
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {formatDate(startValue) || 'DD/MM/AAAA'}
          </Typography>
        </Box>

        <Typography variant="h6" color="text.secondary" sx={{ pb: 0.25 }}>
          –
        </Typography>

        <Box sx={{ minWidth: 0, textAlign: 'center' }}>
          <Typography
            variant="caption"
            color={selectionStep === 'end' ? 'primary.main' : 'text.secondary'}
          >
            Fim
          </Typography>
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            {formatDate(endValue) || 'DD/MM/AAAA'}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <DateCalendar
          value={selectedCalendarValue}
          dayOfWeekFormatter={(date) => weekDayLabels[dayjs(date).day()]}
          onChange={(nextValue) => {
            handleCalendarChange(nextValue?.format('YYYY-MM-DD') ?? '');
          }}
          slots={{
            calendarHeader: RangeCalendarHeader,
            day: RangeDay,
          }}
          sx={{
            width: 320,
            maxHeight: 'none',
            '& .MuiDayCalendar-weekDayLabel': {
              mx: 0,
              width: 40,
            },
            '& .MuiDayCalendar-slideTransition': {
              minHeight: 230,
            },
          }}
        />
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
      >
        <Typography variant="body2" color="text.secondary">
          {formattedValue || 'Selecione o período'}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button variant="text" onClick={handleClear}>
            Limpar
          </Button>
          <Button variant="contained" onClick={handleClose}>
            Concluir
          </Button>
        </Stack>
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
