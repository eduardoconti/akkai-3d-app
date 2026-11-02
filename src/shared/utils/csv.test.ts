import { describe, expect, it } from 'vitest';
import { buildCsv, formatCentsForCsv } from './csv';

interface Linha {
  nome: string;
  valor: number;
  obs?: string;
}

const colunas = [
  { header: 'Nome', exportValue: (linha: Linha) => linha.nome },
  { header: 'Valor', exportValue: (linha: Linha) => linha.valor },
  { header: 'Obs', exportValue: (linha: Linha) => linha.obs },
  { header: 'Ações' },
];

describe('buildCsv', () => {
  it('usa BOM, separador ";" e quebra de linha CRLF', () => {
    const csv = buildCsv([{ nome: 'Caneca', valor: 12.5 }], colunas);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toBe('﻿Nome;Valor;Obs\r\nCaneca;12,5;\r\n');
  });

  it('ignora colunas sem exportValue', () => {
    const csv = buildCsv([{ nome: 'A', valor: 1 }], colunas);

    expect(csv).not.toContain('Ações');
  });

  it('escapa aspas, separador e quebras de linha', () => {
    const csv = buildCsv(
      [{ nome: 'Vaso "grande"; azul', valor: 1, obs: 'linha 1\nlinha 2' }],
      colunas,
    );

    expect(csv).toContain('"Vaso ""grande""; azul"');
    expect(csv).toContain('"linha 1\nlinha 2"');
  });

  it('neutraliza texto que o Excel interpretaria como fórmula', () => {
    const csv = buildCsv([{ nome: '=SOMA(A1)', valor: 1 }], colunas);

    expect(csv).toContain("'=SOMA(A1)");
  });

  it('mantém números negativos como texto numérico', () => {
    const csv = buildCsv([{ nome: '-12,50', valor: -3 }], colunas);

    expect(csv).toContain('-12,50;-3');
  });

  it('gera apenas o cabeçalho quando não há linhas', () => {
    expect(buildCsv([], colunas)).toBe('\uFEFFNome;Valor;Obs\r\n');
  });
});

describe('formatCentsForCsv', () => {
  it('converte centavos em reais com vírgula e duas casas', () => {
    expect(formatCentsForCsv(12345)).toBe('123,45');
    expect(formatCentsForCsv(5)).toBe('0,05');
    expect(formatCentsForCsv(0)).toBe('0,00');
  });

  it('devolve null para valores ausentes ou inválidos', () => {
    expect(formatCentsForCsv(null)).toBeNull();
    expect(formatCentsForCsv(undefined)).toBeNull();
    expect(formatCentsForCsv(Number.NaN)).toBeNull();
  });
});
