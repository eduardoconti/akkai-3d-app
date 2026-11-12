import type { AvailablePermission } from '@/features/auth/api/permissions-admin-api';

const AREAS: Array<{
  id: string;
  label: string;
  modules: Array<{ id: string; label: string }>;
}> = [
  {
    id: 'acesso',
    label: 'Acesso',
    modules: [
      { id: 'usuario', label: 'Usuários' },
      { id: 'papel', label: 'Papéis' },
      { id: 'autenticacao', label: 'Autenticação' },
    ],
  },
  {
    id: 'vendas',
    label: 'Vendas',
    modules: [
      { id: 'venda', label: 'Vendas' },
      { id: 'feira', label: 'Feiras' },
      { id: 'preco-produto-feira', label: 'Preços por feira' },
    ],
  },
  {
    id: 'produtos',
    label: 'Produtos',
    modules: [
      { id: 'produto', label: 'Produtos' },
      { id: 'categoria-produto', label: 'Categorias de produto' },
      { id: 'estoque', label: 'Estoque' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    modules: [
      { id: 'caixa', label: 'Caixas' },
      { id: 'carteira', label: 'Carteiras' },
      { id: 'ajuste-carteira', label: 'Ajustes de carteira' },
      { id: 'transferencia-carteira', label: 'Transferências' },
      {
        id: 'taxa-meio-pagamento-carteira',
        label: 'Taxas por meio de pagamento',
      },
      { id: 'categoria-despesa', label: 'Categorias de despesa' },
      { id: 'despesa', label: 'Despesas' },
    ],
  },
  {
    id: 'assinaturas',
    label: 'Assinaturas',
    modules: [
      { id: 'plano-assinatura', label: 'Planos' },
      { id: 'assinante', label: 'Assinantes' },
      { id: 'ciclo-assinatura', label: 'Ciclos' },
      { id: 'kit-mensal', label: 'Kits mensais' },
    ],
  },
  {
    id: 'orcamentos',
    label: 'Orçamentos',
    modules: [{ id: 'orcamento', label: 'Orçamentos' }],
  },
  {
    id: 'consignacao',
    label: 'Consignação',
    modules: [
      { id: 'consignacao', label: 'Consignações' },
      { id: 'item-consignacao', label: 'Itens de consignação' },
      { id: 'revendedor', label: 'Revendedores' },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    modules: [{ id: 'relatorio', label: 'Relatórios' }],
  },
];

const ACTION_LABELS: Record<string, string> = {
  ler: 'Consultar',
  inserir: 'Inserir',
  alterar: 'Alterar',
  excluir: 'Excluir',
  entrada: 'Entrada',
  saida: 'Saída',
  abrir: 'Abrir',
  fechar: 'Fechar',
  gerar: 'Gerar',
  sair: 'Sair',
  'alterar-papel': 'Alterar papel',
  'alterar-status': 'Alterar status',
  'alterar-senha': 'Alterar senha',
  'administrar-permissoes': 'Administrar permissões',
  'registrar-venda': 'Registrar venda',
  'registrar-devolucao': 'Registrar devolução',
};

const OTHER_AREA_ID = 'outros';

export interface PermissionAction {
  /** Nome técnico completo, ex.: `venda.excluir`. */
  name: string;
  label: string;
  description?: string;
}

export interface PermissionModule {
  id: string;
  label: string;
  actions: PermissionAction[];
}

export interface PermissionArea {
  id: string;
  label: string;
  modules: PermissionModule[];
}

function splitName(name: string): { moduleId: string; action: string } {
  const separatorIndex = name.indexOf('.');

  return separatorIndex === -1
    ? { moduleId: name, action: name }
    : {
        moduleId: name.slice(0, separatorIndex),
        action: name.slice(separatorIndex + 1),
      };
}

function humanize(value: string): string {
  const text = value.replace(/-/g, ' ');

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getActionLabel(name: string): string {
  const { action } = splitName(name);

  return ACTION_LABELS[action] ?? humanize(action);
}

/**
 * Agrupa o catálogo em áreas (Vendas, Financeiro...) e módulos, na ordem de
 * navegação do sistema. Permissões desconhecidas caem em "Outros" para nunca
 * ficarem fora do painel.
 */
export function groupPermissions(
  permissions: AvailablePermission[],
): PermissionArea[] {
  const byModule = new Map<string, PermissionAction[]>();

  for (const permission of permissions) {
    const { moduleId } = splitName(permission.name);
    const actions = byModule.get(moduleId) ?? [];

    actions.push({
      name: permission.name,
      label: getActionLabel(permission.name),
      description: permission.description,
    });
    byModule.set(moduleId, actions);
  }

  const knownModules = new Set(
    AREAS.flatMap((area) => area.modules.map((module) => module.id)),
  );
  const areas: PermissionArea[] = AREAS.map((area) => ({
    id: area.id,
    label: area.label,
    modules: area.modules
      .filter((module) => byModule.has(module.id))
      .map((module) => ({
        id: module.id,
        label: module.label,
        actions: byModule.get(module.id) ?? [],
      })),
  }));

  const otherModules = [...byModule.keys()]
    .filter((moduleId) => !knownModules.has(moduleId))
    .sort()
    .map((moduleId) => ({
      id: moduleId,
      label: humanize(moduleId),
      actions: byModule.get(moduleId) ?? [],
    }));

  if (otherModules.length > 0) {
    areas.push({ id: OTHER_AREA_ID, label: 'Outros', modules: otherModules });
  }

  return areas.filter((area) => area.modules.length > 0);
}

/** Ajustes individuais de um usuário em relação ao papel escolhido. */
export interface PermissionAdjustments {
  granted: Set<string>;
  revoked: Set<string>;
}

export function emptyAdjustments(): PermissionAdjustments {
  return { granted: new Set(), revoked: new Set() };
}

/** Descarta ajustes que o papel escolhido já cobre (ou que não fazem mais sentido). */
export function normalizeAdjustments(
  adjustments: PermissionAdjustments,
  rolePermissions: ReadonlySet<string>,
): PermissionAdjustments {
  return {
    granted: new Set(
      [...adjustments.granted].filter((name) => !rolePermissions.has(name)),
    ),
    revoked: new Set(
      [...adjustments.revoked].filter((name) => rolePermissions.has(name)),
    ),
  };
}

export function isPermissionActive(
  name: string,
  rolePermissions: ReadonlySet<string>,
  adjustments: PermissionAdjustments,
): boolean {
  return rolePermissions.has(name)
    ? !adjustments.revoked.has(name)
    : adjustments.granted.has(name);
}

export function getEffectivePermissions(
  allNames: string[],
  rolePermissions: ReadonlySet<string>,
  adjustments: PermissionAdjustments,
): string[] {
  return allNames.filter((name) =>
    isPermissionActive(name, rolePermissions, adjustments),
  );
}

/** Liga ou desliga permissões, registrando como ajuste só o que difere do papel. */
export function setPermissionsActive(
  names: string[],
  active: boolean,
  rolePermissions: ReadonlySet<string>,
  adjustments: PermissionAdjustments,
): PermissionAdjustments {
  const granted = new Set(adjustments.granted);
  const revoked = new Set(adjustments.revoked);

  for (const name of names) {
    if (rolePermissions.has(name)) {
      if (active) {
        revoked.delete(name);
      } else {
        revoked.add(name);
      }
    } else if (active) {
      granted.add(name);
    } else {
      granted.delete(name);
    }
  }

  return { granted, revoked };
}

export function countAdjustments(adjustments: PermissionAdjustments): number {
  return adjustments.granted.size + adjustments.revoked.size;
}

/** Quantos ajustes mudaram em relação ao que está salvo para o usuário. */
export function countPendingChanges(
  current: PermissionAdjustments,
  saved: PermissionAdjustments,
  roleChanged: boolean,
): number {
  const differences = (left: Set<string>, right: Set<string>) =>
    [...left].filter((name) => !right.has(name)).length +
    [...right].filter((name) => !left.has(name)).length;

  return (
    differences(current.granted, saved.granted) +
    differences(current.revoked, saved.revoked) +
    (roleChanged ? 1 : 0)
  );
}
