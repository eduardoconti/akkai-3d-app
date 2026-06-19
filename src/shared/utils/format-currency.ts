export const HIDDEN_CURRENCY_VALUE = 'R$ ••••';
export const HIDDEN_VALUE = '••••••';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
}

export function formatCurrencyWithVisibility(
  value: number,
  hideValues: boolean,
): string {
  return hideValues ? HIDDEN_CURRENCY_VALUE : formatCurrency(value);
}

export function formatValueWithVisibility(
  value: string,
  hideValues: boolean,
): string {
  return hideValues ? HIDDEN_VALUE : value;
}
