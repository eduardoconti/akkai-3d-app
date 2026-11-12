import { describe, expect, it } from 'vitest';
import { summarizeSelection } from './summarize-selection';

const origens = [
  { value: 'COMPRA', label: 'Compra' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'PERDA', label: 'Perda' },
  { value: 'PRODUCAO', label: 'Produção' },
  { value: 'TROCA', label: 'Troca' },
  { value: 'VENDA', label: 'Venda' },
] as const;

type Origem = (typeof origens)[number]['value'];

function resumo(selecionadas: Origem[]) {
  return summarizeSelection<Origem>(selecionadas, origens, 'origens');
}

describe('summarizeSelection', () => {
  it('resume a seleção completa como "Todas"', () => {
    expect(resumo(origens.map((origem) => origem.value))).toBe('Todas');
  });

  it('descreve pelo que ficou de fora quando faltam poucas', () => {
    expect(resumo(['COMPRA', 'AJUSTE', 'PERDA', 'PRODUCAO', 'TROCA'])).toBe(
      'Todas, exceto venda',
    );
    expect(resumo(['COMPRA', 'AJUSTE', 'PERDA', 'PRODUCAO'])).toBe(
      'Todas, exceto troca e venda',
    );
  });

  it('lista pelo nome quando há poucas selecionadas', () => {
    expect(resumo(['COMPRA'])).toBe('Compra');
    expect(resumo(['AJUSTE', 'COMPRA'])).toBe('Ajuste e Compra');
  });

  it('mostra a contagem nos demais casos', () => {
    expect(resumo(['COMPRA', 'AJUSTE', 'PERDA'])).toBe('3 origens');
  });

  it('usa "Todos" quando o termo é masculino', () => {
    expect(
      summarizeSelection<Origem>(
        ['COMPRA', 'AJUSTE', 'PERDA', 'PRODUCAO', 'TROCA'],
        origens,
        'status',
        'Todos',
      ),
    ).toBe('Todos, exceto venda');
  });

  it('retorna vazio quando nada está selecionado', () => {
    expect(resumo([])).toBe('');
  });
});
