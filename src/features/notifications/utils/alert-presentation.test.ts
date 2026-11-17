import { describe, expect, it } from 'vitest';
import type { Alerta } from '@/shared/lib/types/domain';
import {
  formatRelativeTime,
  getAlertDestination,
  getAlertItemDestination,
} from './alert-presentation';

const now = new Date('2026-11-16T12:00:00.000Z').getTime();

function alerta(tipo: Alerta['tipo']): Alerta {
  return {
    tipo,
    severidade: 'AVISO',
    titulo: '',
    descricao: '',
    quantidade: 1,
    chave: '',
    itens: [],
  };
}

describe('formatRelativeTime', () => {
  it('formata minutos, horas e dias em português', () => {
    expect(formatRelativeTime('2026-11-16T11:59:30.000Z', now)).toBe('agora');
    expect(formatRelativeTime('2026-11-16T11:15:00.000Z', now)).toBe(
      'há 45 minutos',
    );
    expect(formatRelativeTime('2026-11-16T07:00:00.000Z', now)).toBe(
      'há 5 horas',
    );
    expect(formatRelativeTime('2026-11-13T12:00:00.000Z', now)).toBe(
      'há 3 dias',
    );
  });

  it('devolve texto vazio para data inválida', () => {
    expect(formatRelativeTime('não é data', now)).toBe('');
  });
});

describe('destinos dos alertas', () => {
  it('leva cada tipo para a tela onde o problema é resolvido', () => {
    expect(getAlertDestination(alerta('ORCAMENTO_PENDENTE'))).toBe(
      '/orcamentos?status=PENDENTE',
    );
    expect(getAlertDestination(alerta('CAIXA_ABERTO_PROLONGADO'))).toBe(
      '/financeiro/caixas',
    );
    expect(getAlertDestination(alerta('ESTOQUE_NEGATIVO'))).toBe(
      '/produtos?ordenarPor=nivelEstoque&direcao=asc',
    );
  });

  it('filtra a lista de produtos pelo item de estoque negativo', () => {
    expect(
      getAlertItemDestination(alerta('ESTOQUE_NEGATIVO'), {
        id: 5,
        titulo: 'Dragão azul',
      }),
    ).toBe(
      '/produtos?ordenarPor=nivelEstoque&direcao=asc&termo=Drag%C3%A3o+azul',
    );
    expect(
      getAlertItemDestination(alerta('ORCAMENTO_PENDENTE'), {
        id: 1,
        titulo: 'Maria',
      }),
    ).toBe('/orcamentos?status=PENDENTE');
  });
});
