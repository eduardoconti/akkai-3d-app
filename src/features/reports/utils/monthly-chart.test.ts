import { describe, expect, it } from 'vitest';
import type { DashboardMonthlySummaryItem } from '../api/reports-api';
import { getContinuousMonthRange, getNiceAxisMax } from './monthly-chart';

function mes(
  numero: number,
  valores: Partial<DashboardMonthlySummaryItem> = {},
): DashboardMonthlySummaryItem {
  return {
    mes: numero,
    quantidadeItensVendidos: 0,
    quantidadeItensCatalogo: 0,
    quantidadeBrindes: 0,
    quantidadeItensAvulsos: 0,
    valorVendas: 0,
    valorTaxas: 0,
    valorImpostos: 0,
    valorDespesas: 0,
    saldo: 0,
    ...valores,
  } as DashboardMonthlySummaryItem;
}

describe('getContinuousMonthRange', () => {
  it('remove os meses vazios das pontas e mantém os do meio', () => {
    const itens = [
      mes(1),
      mes(2),
      mes(3, { valorVendas: 100 }),
      mes(4),
      mes(5),
      mes(6, { valorDespesas: 50 }),
      mes(7),
      mes(12),
    ];

    expect(getContinuousMonthRange(itens).map((item) => item.mes)).toEqual([
      3, 4, 5, 6,
    ]);
  });

  it('considera saldo negativo como movimento', () => {
    expect(
      getContinuousMonthRange([mes(1), mes(2, { saldo: -10 })]).map(
        (item) => item.mes,
      ),
    ).toEqual([2]);
  });

  it('ordena os meses antes de calcular o intervalo', () => {
    const itens = [mes(5, { valorVendas: 1 }), mes(3, { valorVendas: 1 })];

    expect(getContinuousMonthRange(itens).map((item) => item.mes)).toEqual([
      3, 5,
    ]);
  });

  it('retorna vazio quando nenhum mês tem movimento', () => {
    expect(getContinuousMonthRange([mes(1), mes(2)])).toEqual([]);
  });
});

describe('getNiceAxisMax', () => {
  it.each([
    [963200, 1000000],
    [480000, 500000],
    [210000, 250000],
    [150000, 200000],
    [100000, 100000],
    [7, 10],
  ])('arredonda %d para %d', (valor, esperado) => {
    expect(getNiceAxisMax(valor)).toBe(esperado);
  });

  it('retorna zero para valores não positivos', () => {
    expect(getNiceAxisMax(0)).toBe(0);
    expect(getNiceAxisMax(-5)).toBe(0);
  });
});
