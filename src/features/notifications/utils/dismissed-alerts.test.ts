import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Alerta } from '@/shared/lib/types/domain';
import {
  isAlertDismissed,
  loadDismissedAlerts,
  saveDismissedAlerts,
} from './dismissed-alerts';

const alerta: Alerta = {
  tipo: 'ORCAMENTO_PENDENTE',
  severidade: 'AVISO',
  titulo: '2 orçamentos pendentes',
  descricao: '',
  quantidade: 2,
  chave: 'ORCAMENTO_PENDENTE:2:1,2',
  itens: [],
};

describe('dismissed-alerts', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('salva e carrega os dispensados separados por usuário', () => {
    saveDismissedAlerts(1, { ORCAMENTO_PENDENTE: alerta.chave });

    expect(loadDismissedAlerts(1)).toEqual({
      ORCAMENTO_PENDENTE: alerta.chave,
    });
    expect(loadDismissedAlerts(2)).toEqual({});
  });

  it('ignora conteúdo inválido no armazenamento', () => {
    window.localStorage.setItem('akkai:alertas-dispensados:1', '[1,2]');
    expect(loadDismissedAlerts(1)).toEqual({});

    window.localStorage.setItem(
      'akkai:alertas-dispensados:1',
      '{"ORCAMENTO_PENDENTE":5,"ESTOQUE_NEGATIVO":"x"}',
    );
    expect(loadDismissedAlerts(1)).toEqual({ ESTOQUE_NEGATIVO: 'x' });

    window.localStorage.setItem('akkai:alertas-dispensados:1', '{quebrado');
    expect(loadDismissedAlerts(1)).toEqual({});
  });

  it('não quebra quando o armazenamento está indisponível', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => saveDismissedAlerts(1, {})).not.toThrow();
    expect(loadDismissedAlerts(1)).toEqual({});
  });

  it('considera dispensado só enquanto a chave do alerta não muda', () => {
    expect(isAlertDismissed(alerta, { ORCAMENTO_PENDENTE: alerta.chave })).toBe(
      true,
    );
    expect(
      isAlertDismissed(
        { ...alerta, chave: 'ORCAMENTO_PENDENTE:3:1,2,3' },
        { ORCAMENTO_PENDENTE: alerta.chave },
      ),
    ).toBe(false);
    expect(isAlertDismissed(alerta, {})).toBe(false);
  });
});
