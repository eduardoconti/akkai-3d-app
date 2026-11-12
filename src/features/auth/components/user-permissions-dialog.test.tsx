import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '@/test/setup';
import type {
  AvailablePermission,
  RoleWithPermissions,
  UserPermissions,
} from '@/features/auth/api/permissions-admin-api';
import UserPermissionsDialog from './user-permissions-dialog';

const getUserPermissions = vi.fn();
const setUserPermissions = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/features/auth/api/permissions-admin-api', () => ({
  getUserPermissions: (...args: unknown[]) => getUserPermissions(...args),
  setUserPermissions: (...args: unknown[]) => setUserPermissions(...args),
}));
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

const permissions: AvailablePermission[] = [
  { name: 'venda.ler' },
  { name: 'venda.excluir' },
  { name: 'produto.ler' },
  { name: 'usuario.administrar-permissoes' },
];
const roles: RoleWithPermissions[] = [
  {
    id: 1,
    name: 'user',
    permissoes: ['venda.ler', 'venda.excluir', 'produto.ler'],
    quantidadeUsuarios: 1,
    protegido: true,
  },
  {
    id: 2,
    name: 'admin',
    permissoes: [
      'venda.ler',
      'venda.excluir',
      'produto.ler',
      'usuario.administrar-permissoes',
    ],
    quantidadeUsuarios: 2,
    protegido: true,
  },
];
const detail: UserPermissions = {
  id: 3,
  login: 'tinho',
  name: 'Tinho',
  isActive: true,
  idPapel: 1,
  papel: 'user',
  permissoesEfetivas: ['venda.ler', 'venda.excluir', 'produto.ler'],
  concedidas: [],
  revogadas: [],
};

function renderDialog(onSaved = vi.fn(), onClose = vi.fn()) {
  render(
    <UserPermissionsDialog
      open
      userId={3}
      permissions={permissions}
      roles={roles}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );

  return { onSaved, onClose };
}

async function openArea(name: string) {
  await userEvent.click(await screen.findByRole('button', { name }));
}

beforeEach(() => {
  mockMatchMedia(false);
  getUserPermissions.mockReset().mockResolvedValue(detail);
  setUserPermissions.mockReset().mockResolvedValue(detail);
  useAuthMock.mockReset().mockReturnValue({ user: { id: 1 } });
});

describe('UserPermissionsDialog', () => {
  it('carrega o usuário e mantém "Salvar" desabilitado sem alterações', async () => {
    renderDialog();

    expect(await screen.findByText('Permissões de Tinho')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Salvar permissões' }),
    ).toBeDisabled();
  });

  it('envia o conjunto final de permissões após revogar uma', async () => {
    const { onSaved } = renderDialog();
    await openArea('Vendas 2/2');

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Vendas: Excluir' }),
    );

    expect(screen.getByText('Revogada')).toBeInTheDocument();
    expect(screen.getByText('1 alteração(ões) não salva(s)')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar permissões' }),
    );

    await waitFor(() =>
      expect(setUserPermissions).toHaveBeenCalledWith(3, {
        idPapel: 1,
        permissoes: ['venda.ler', 'produto.ler'],
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('concede uma permissão que o papel não tem', async () => {
    renderDialog();
    await openArea('Acesso 0/1');

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: 'Usuários: Administrar permissões',
      }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar permissões' }),
    );

    await waitFor(() =>
      expect(setUserPermissions).toHaveBeenCalledWith(3, {
        idPapel: 1,
        permissoes: [
          'venda.ler',
          'venda.excluir',
          'produto.ler',
          'usuario.administrar-permissoes',
        ],
      }),
    );
  });

  it('mostra a mensagem do servidor quando salvar falha', async () => {
    const { ApiProblemError } = await import('@/shared/lib/api/http-client');
    setUserPermissions.mockRejectedValue(
      new ApiProblemError({
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: 'Você não pode conceder permissões que não possui.',
        instance: '',
      }),
    );
    const { onSaved } = renderDialog();
    await openArea('Vendas 2/2');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Vendas: Excluir' }),
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar permissões' }),
    );

    expect(
      await screen.findByText(
        'Você não pode conceder permissões que não possui.',
      ),
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('impede o administrador de remover a própria permissão de administrar', async () => {
    useAuthMock.mockReturnValue({ user: { id: 3 } });
    getUserPermissions.mockResolvedValue({
      ...detail,
      idPapel: 2,
      papel: 'admin',
      permissoesEfetivas: roles[1].permissoes,
    });
    renderDialog();
    await openArea('Acesso 1/1');

    expect(
      screen.getByRole('checkbox', {
        name: 'Usuários: Administrar permissões',
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Você está editando o seu próprio acesso/),
    ).toBeInTheDocument();
  });

  it('pede confirmação ao fechar com alterações não salvas', async () => {
    const { onClose } = renderDialog();
    await openArea('Vendas 2/2');
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Vendas: Excluir' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByText('Descartar alterações?')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
