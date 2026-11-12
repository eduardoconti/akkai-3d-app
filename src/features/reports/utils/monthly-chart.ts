import type { DashboardMonthlySummaryItem } from '../api/reports-api';

function hasMovement(item: DashboardMonthlySummaryItem): boolean {
  return item.valorVendas !== 0 || item.valorDespesas !== 0 || item.saldo !== 0;
}

/**
 * Mantém o intervalo contínuo entre o primeiro e o último mês com movimento.
 * Remove só os meses vazios das pontas: um mês zerado no meio continua no
 * gráfico, para o eixo do tempo não pular meses (ex.: agosto colado em
 * novembro).
 */
export function getContinuousMonthRange(
  items: readonly DashboardMonthlySummaryItem[],
): DashboardMonthlySummaryItem[] {
  const sorted = [...items].sort((a, b) => a.mes - b.mes);
  const first = sorted.findIndex(hasMovement);

  if (first === -1) {
    return [];
  }

  const last = sorted.length - 1 - [...sorted].reverse().findIndex(hasMovement);

  return sorted.slice(first, last + 1);
}

const NICE_STEPS = [1, 2, 2.5, 5, 10];

/**
 * Arredonda o topo do eixo para um valor "redondo" (1, 2, 2,5 ou 5 × 10ⁿ),
 * para as marcações do eixo serem fáceis de ler (ex.: 9.632 → 10.000).
 */
export function getNiceAxisMax(value: number): number {
  if (value <= 0) {
    return 0;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    NICE_STEPS.find((candidate) => normalized <= candidate) ?? NICE_STEPS[4];

  return step * magnitude;
}
