import { describe, expect, it } from 'vitest';
import { initialSaleFormState } from '@/features/sales/types/sale-form';
import {
  loadQuickSaleDefaults,
  loadQuickSaleDrafts,
  saveQuickSaleDefaults,
  saveQuickSaleDrafts,
  type QuickSaleDraft,
} from './quick-sale-draft-storage';

const AGORA = Date.UTC(2026, 10, 2, 12, 0, 0);
const UM_DIA = 24 * 60 * 60 * 1000;

function criarRascunho(
  criadoEm: number,
  { comItem = true, indice = 1 } = {},
): QuickSaleDraft {
  return {
    id: `quick-sale-${criadoEm}-${indice}`,
    label: `Venda ${indice}`,
    form: {
      ...initialSaleFormState,
      itens: [
        comItem
          ? {
              tipoItem: 'CATALOGO',
              idProduto: 7,
              nomeProduto: 'Caneca',
              valorUnitario: 25,
              quantidade: 2,
              brinde: false,
            }
          : { ...initialSaleFormState.itens[0]! },
      ],
    },
  };
}

describe('rascunhos da venda rápida', () => {
  it('recupera o que foi salvo para o usuário', () => {
    const rascunho = criarRascunho(AGORA - 1000);
    saveQuickSaleDrafts(1, { sequence: 3, drafts: [rascunho] });

    const carregado = loadQuickSaleDrafts(1, AGORA);

    expect(carregado.sequence).toBe(3);
    expect(carregado.drafts).toHaveLength(1);
    expect(carregado.drafts[0]!.id).toBe(rascunho.id);
  });

  it('separa os rascunhos por usuário', () => {
    saveQuickSaleDrafts(1, {
      sequence: 1,
      drafts: [criarRascunho(AGORA - 1000)],
    });

    expect(loadQuickSaleDrafts(2, AGORA).drafts).toEqual([]);
  });

  it('descarta rascunhos com mais de 24 horas', () => {
    saveQuickSaleDrafts(1, {
      sequence: 2,
      drafts: [
        criarRascunho(AGORA - UM_DIA - 1000, { indice: 1 }),
        criarRascunho(AGORA - 1000, { indice: 2 }),
      ],
    });

    const { drafts } = loadQuickSaleDrafts(1, AGORA);

    expect(drafts.map((rascunho) => rascunho.label)).toEqual(['Venda 2']);
  });

  it('descarta rascunhos sem nenhum item preenchido', () => {
    saveQuickSaleDrafts(1, {
      sequence: 1,
      drafts: [criarRascunho(AGORA - 1000, { comItem: false })],
    });

    expect(loadQuickSaleDrafts(1, AGORA).drafts).toEqual([]);
  });

  it('remove a chave do armazenamento quando não há rascunhos', () => {
    saveQuickSaleDrafts(1, {
      sequence: 1,
      drafts: [criarRascunho(AGORA - 1000)],
    });
    saveQuickSaleDrafts(1, { sequence: 1, drafts: [] });

    expect(window.localStorage.length).toBe(0);
  });

  it('ignora conteúdo corrompido ou de outra versão', () => {
    window.localStorage.setItem('akkai-quick-sale-drafts:1', '{nao-e-json');
    expect(loadQuickSaleDrafts(1, AGORA).drafts).toEqual([]);

    window.localStorage.setItem(
      'akkai-quick-sale-drafts:1',
      JSON.stringify({ version: 99, drafts: [] }),
    );
    expect(loadQuickSaleDrafts(1, AGORA).drafts).toEqual([]);
  });

  it('não faz nada sem usuário identificado', () => {
    saveQuickSaleDrafts(undefined, {
      sequence: 1,
      drafts: [criarRascunho(AGORA - 1000)],
    });

    expect(window.localStorage.length).toBe(0);
    expect(loadQuickSaleDrafts(undefined, AGORA).drafts).toEqual([]);
  });
});

describe('últimas escolhas da venda rápida', () => {
  it('salva e recupera tipo, feira, carteira e meio de pagamento', () => {
    saveQuickSaleDefaults(5, {
      tipo: 'FEIRA',
      idFeira: 3,
      idCarteira: 2,
      meioPagamento: 'PIX',
    });

    expect(loadQuickSaleDefaults(5)).toEqual({
      tipo: 'FEIRA',
      idFeira: 3,
      idCarteira: 2,
      meioPagamento: 'PIX',
    });
  });

  it('normaliza campos ausentes para vazio', () => {
    window.localStorage.setItem(
      'akkai-quick-sale-defaults:5',
      JSON.stringify({ tipo: 'LOJA' }),
    );

    expect(loadQuickSaleDefaults(5)).toEqual({
      tipo: 'LOJA',
      idFeira: '',
      idCarteira: '',
      meioPagamento: undefined,
    });
  });

  it('devolve null quando não há dados válidos', () => {
    expect(loadQuickSaleDefaults(5)).toBeNull();

    window.localStorage.setItem('akkai-quick-sale-defaults:5', 'lixo');
    expect(loadQuickSaleDefaults(5)).toBeNull();
  });
});
