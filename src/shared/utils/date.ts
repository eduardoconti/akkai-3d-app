export type LocalDateFormat =
  | 'input'
  | 'api-date-time'
  | 'api-current-date-time'
  | 'display-date'
  | 'display-date-time';

const APP_TIMEZONE_OFFSET = '-03:00';

function getDateParts(value?: Date | string | null): {
  year: string;
  month: string;
  day: string;
} {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (match) {
      return {
        year: match[1]!,
        month: match[2]!,
        day: match[3]!,
      };
    }
  }

  const date = value instanceof Date ? value : new Date();

  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

function getDateTimeParts(value?: Date | string | null): {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
} {
  const date = value instanceof Date ? value : new Date(value ?? new Date());

  if (Number.isNaN(date.getTime())) {
    return { ...getDateParts(value), hour: '00', minute: '00' };
  }

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
    hour: String(date.getHours()).padStart(2, '0'),
    minute: String(date.getMinutes()).padStart(2, '0'),
  };
}

function getCurrentTimeParts(): {
  hour: string;
  minute: string;
  second: string;
} {
  const now = new Date();

  return {
    hour: String(now.getHours()).padStart(2, '0'),
    minute: String(now.getMinutes()).padStart(2, '0'),
    second: String(now.getSeconds()).padStart(2, '0'),
  };
}

export function formatLocalDate(
  value?: Date | string | null,
  format: LocalDateFormat = 'input',
): string {
  const { year, month, day } = getDateParts(value);

  if (format === 'api-date-time') {
    return `${year}-${month}-${day}T00:00:00${APP_TIMEZONE_OFFSET}`;
  }

  if (format === 'api-current-date-time') {
    const { hour, minute, second } = getCurrentTimeParts();

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${APP_TIMEZONE_OFFSET}`;
  }

  if (format === 'display-date') {
    return `${day}/${month}/${year}`;
  }

  if (format === 'display-date-time') {
    const partes = getDateTimeParts(value);

    return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
  }

  return `${year}-${month}-${day}`;
}
