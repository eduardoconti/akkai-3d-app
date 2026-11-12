import { describe, expect, it } from 'vitest';
import {
  ALL_STATUSES_ORCAMENTO,
  STATUSES_PADRAO_PESQUISA_ORCAMENTO,
} from './budget-form';

describe('STATUSES_PADRAO_PESQUISA_ORCAMENTO', () => {
  it('deixa de fora os orçamentos encerrados (finalizados e cancelados)', () => {
    expect(STATUSES_PADRAO_PESQUISA_ORCAMENTO).not.toContain('FINALIZADO');
    expect(STATUSES_PADRAO_PESQUISA_ORCAMENTO).not.toContain('CANCELADO');
  });

  it('mantém todos os status em andamento', () => {
    expect(STATUSES_PADRAO_PESQUISA_ORCAMENTO).toEqual([
      'PENDENTE',
      'ATENDIMENTO',
      'AGUARDANDO_APROVACAO',
      'APROVADO',
      'PRODUZIDO',
    ]);
  });

  it('continua oferecendo todos os status para filtrar manualmente', () => {
    expect(ALL_STATUSES_ORCAMENTO).toContain('CANCELADO');
    expect(ALL_STATUSES_ORCAMENTO).toContain('FINALIZADO');
  });
});
