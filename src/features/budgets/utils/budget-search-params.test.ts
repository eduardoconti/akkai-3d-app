import { describe, expect, it } from 'vitest';
import { parseBudgetStatusParam } from './budget-search-params';

describe('parseBudgetStatusParam', () => {
  it('lê um ou mais status válidos', () => {
    expect(parseBudgetStatusParam('PENDENTE')).toEqual(['PENDENTE']);
    expect(parseBudgetStatusParam('pendente, APROVADO,PENDENTE')).toEqual([
      'PENDENTE',
      'APROVADO',
    ]);
  });

  it('devolve null sem parâmetro ou sem status válido', () => {
    expect(parseBudgetStatusParam(null)).toBeNull();
    expect(parseBudgetStatusParam('')).toBeNull();
    expect(parseBudgetStatusParam('QUALQUER')).toBeNull();
  });
});
