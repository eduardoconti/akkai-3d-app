import { describe, expect, it } from 'vitest';
import {
  countPendingChanges,
  emptyAdjustments,
  getActionLabel,
  getEffectivePermissions,
  groupPermissions,
  isPermissionActive,
  normalizeAdjustments,
  setPermissionsActive,
} from './permission-model';

const role = new Set(['venda.ler', 'venda.excluir']);

describe('groupPermissions', () => {
  it('agrupa por área e módulo na ordem de navegação', () => {
    const areas = groupPermissions([
      { name: 'caixa.ler' },
      { name: 'venda.ler' },
      { name: 'venda.excluir', description: 'Excluir vendas' },
    ]);

    expect(areas.map((area) => area.label)).toEqual(['Vendas', 'Financeiro']);
    expect(areas[0].modules[0]).toMatchObject({
      id: 'venda',
      label: 'Vendas',
      actions: [
        { name: 'venda.ler', label: 'Consultar' },
        {
          name: 'venda.excluir',
          label: 'Excluir',
          description: 'Excluir vendas',
        },
      ],
    });
  });

  it('coloca permissões de módulos desconhecidos em "Outros"', () => {
    const areas = groupPermissions([{ name: 'novo-modulo.exportar' }]);

    expect(areas).toEqual([
      {
        id: 'outros',
        label: 'Outros',
        modules: [
          {
            id: 'novo-modulo',
            label: 'Novo modulo',
            actions: [
              {
                name: 'novo-modulo.exportar',
                label: 'Exportar',
                description: undefined,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('não exibe áreas sem permissões', () => {
    expect(groupPermissions([])).toEqual([]);
  });
});

describe('getActionLabel', () => {
  it('traduz ações conhecidas e humaniza as demais', () => {
    expect(getActionLabel('usuario.alterar-papel')).toBe('Alterar papel');
    expect(getActionLabel('relatorio.ler')).toBe('Consultar');
    expect(getActionLabel('x.exportar-tudo')).toBe('Exportar tudo');
  });
});

describe('ajustes de permissão', () => {
  it('desligar uma permissão do papel registra uma revogação', () => {
    const next = setPermissionsActive(
      ['venda.excluir'],
      false,
      role,
      emptyAdjustments(),
    );

    expect([...next.revoked]).toEqual(['venda.excluir']);
    expect(isPermissionActive('venda.excluir', role, next)).toBe(false);
  });

  it('religar uma permissão revogada remove o ajuste', () => {
    const revoked = setPermissionsActive(
      ['venda.excluir'],
      false,
      role,
      emptyAdjustments(),
    );
    const next = setPermissionsActive(['venda.excluir'], true, role, revoked);

    expect(next.revoked.size).toBe(0);
  });

  it('ligar uma permissão fora do papel registra uma concessão', () => {
    const next = setPermissionsActive(
      ['produto.excluir'],
      true,
      role,
      emptyAdjustments(),
    );

    expect([...next.granted]).toEqual(['produto.excluir']);
    expect(isPermissionActive('produto.excluir', role, next)).toBe(true);
  });

  it('desligar uma concessão remove o ajuste', () => {
    const granted = setPermissionsActive(
      ['produto.excluir'],
      true,
      role,
      emptyAdjustments(),
    );
    const next = setPermissionsActive(
      ['produto.excluir'],
      false,
      role,
      granted,
    );

    expect(next.granted.size).toBe(0);
  });

  it('calcula as permissões efetivas', () => {
    const adjustments = {
      granted: new Set(['produto.excluir']),
      revoked: new Set(['venda.excluir']),
    };

    expect(
      getEffectivePermissions(
        ['venda.ler', 'venda.excluir', 'produto.excluir', 'caixa.ler'],
        role,
        adjustments,
      ),
    ).toEqual(['venda.ler', 'produto.excluir']);
  });

  it('ao trocar de papel, descarta ajustes que o novo papel já cobre', () => {
    const adjustments = {
      granted: new Set(['produto.excluir', 'venda.ler']),
      revoked: new Set(['venda.excluir', 'caixa.ler']),
    };
    const newRole = new Set(['produto.excluir', 'caixa.ler']);

    const next = normalizeAdjustments(adjustments, newRole);

    expect([...next.granted]).toEqual(['venda.ler']);
    expect([...next.revoked]).toEqual(['caixa.ler']);
  });
});

describe('countPendingChanges', () => {
  it('é zero quando nada mudou', () => {
    const saved = {
      granted: new Set(['a']),
      revoked: new Set(['b']),
    };

    expect(
      countPendingChanges(
        { granted: new Set(['a']), revoked: new Set(['b']) },
        saved,
        false,
      ),
    ).toBe(0);
  });

  it('conta ajustes adicionados, removidos e a troca de papel', () => {
    const saved = { granted: new Set(['a']), revoked: new Set<string>() };
    const current = {
      granted: new Set(['b']),
      revoked: new Set(['c']),
    };

    expect(countPendingChanges(current, saved, true)).toBe(4);
  });
});
