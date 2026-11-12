import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '@/test/setup';
import type {
  AvailablePermission,
  RoleWithPermissions,
} from '@/features/auth/api/permissions-admin-api';
import RoleDialog from './role-dialog';

const createRole = vi.fn();
const updateRole = vi.fn();
const deleteRole = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/features/auth/api/permissions-admin-api', () => ({
  createRole: (...args: unknown[]) => createRole(...args),
  updateRole: (...args: unknown[]) => updateRole(...args),
  deleteRole: (...args: unknown[]) => deleteRole(...args),
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

function role(
  overrides: Partial<RoleWithPermissions> = {},
): RoleWithPermissions {
  return {
    id: 3,
    name: 'vendedor',
    description: 'Atende no balcão',
    permissoes: ['venda.ler'],
    quantidadeUsuarios: 0,
    protegido: false,
    ...overrides,
  };
}

function renderDialog(
  current: RoleWithPermissions | null,
  handlers = { onSaved: vi.fn(), onClose: vi.fn() },
) {
  render(
    <RoleDialog
      open
      role={current}
      permissions={permissions}
      onClose={handlers.onClose}
      onSaved={handlers.onSaved}
    />,
  );

  return handlers;
}

beforeEach(() => {
  mockMatchMedia(false);
  createRole.mockReset().mockResolvedValue(role());
  updateRole.mockReset().mockResolvedValue(role());
  deleteRole.mockReset().mockResolvedValue(undefined);
  useAuthMock.mockReset().mockReturnValue({ user: { id: 1, role: 'admin' } });
});

describe('RoleDialog', () => {
  it('cria um papel com as permissões marcadas', async () => {
    const { onSaved } = renderDialog(null);
    const save = screen.getByRole('button', { name: 'Criar papel' });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Nome do papel/), 'Caixa');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Opera o caixa');
    await userEvent.click(screen.getByRole('button', { name: 'Vendas 0/2' }));
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Vendas: Consultar' }),
    );
    await userEvent.click(save);

    await waitFor(() =>
      expect(createRole).toHaveBeenCalledWith({
        name: 'Caixa',
        description: 'Opera o caixa',
        permissoes: ['venda.ler'],
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('só habilita "Criar papel" com nome de pelo menos 2 caracteres', async () => {
    renderDialog(null);

    await userEvent.type(screen.getByLabelText(/Nome do papel/), 'a');

    expect(screen.getByRole('button', { name: 'Criar papel' })).toBeDisabled();
  });

  it('edita o papel enviando o conjunto final de permissões', async () => {
    renderDialog(role());
    await userEvent.click(screen.getByRole('button', { name: 'Vendas 1/2' }));

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Vendas: Excluir' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar papel' }));

    await waitFor(() =>
      expect(updateRole).toHaveBeenCalledWith(3, {
        name: 'vendedor',
        description: 'Atende no balcão',
        permissoes: ['venda.ler', 'venda.excluir'],
      }),
    );
  });

  it('não permite renomear papéis do sistema', () => {
    renderDialog(role({ name: 'user', protegido: true }));

    expect(screen.getByLabelText(/Nome do papel/)).toBeDisabled();
    expect(
      screen.getByText('Papel do sistema: o nome não pode ser alterado.'),
    ).toBeInTheDocument();
  });

  it('mostra o conflito de nome vindo do servidor no campo', async () => {
    const { ApiProblemError } = await import('@/shared/lib/api/http-client');
    createRole.mockRejectedValue(
      new ApiProblemError({
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'Já existe um papel chamado "Caixa".',
        instance: '',
      }),
    );
    renderDialog(null);
    await userEvent.type(screen.getByLabelText(/Nome do papel/), 'Caixa');

    await userEvent.click(screen.getByRole('button', { name: 'Criar papel' }));

    expect(
      (await screen.findAllByText('Já existe um papel chamado "Caixa".'))
        .length,
    ).toBeGreaterThan(0);
  });

  it('exclui um papel sem usuários após confirmação', async () => {
    const { onSaved } = renderDialog(role());

    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir papel' }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Excluir' }),
    );

    await waitFor(() => expect(deleteRole).toHaveBeenCalledWith(3));
    expect(onSaved).toHaveBeenCalled();
  });

  it('bloqueia a exclusão de papel em uso ou do sistema', () => {
    const { unmount } = render(
      <RoleDialog
        open
        role={role({ quantidadeUsuarios: 2 })}
        permissions={permissions}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Excluir papel' }),
    ).toBeDisabled();
    unmount();

    renderDialog(role({ name: 'admin', protegido: true }));
    expect(
      screen.getByRole('button', { name: 'Excluir papel' }),
    ).toBeDisabled();
  });

  it('trava as permissões de administração no próprio papel', async () => {
    renderDialog(
      role({
        name: 'admin',
        protegido: true,
        permissoes: ['usuario.administrar-permissoes'],
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Acesso 1/1' }));

    expect(
      screen.getByRole('checkbox', {
        name: 'Usuários: Administrar permissões',
      }),
    ).toBeDisabled();
    expect(screen.getByText(/Este é o seu próprio papel/)).toBeInTheDocument();
  });

  it('pede confirmação ao fechar com alterações não salvas', async () => {
    const { onClose } = renderDialog(role());
    await userEvent.type(screen.getByLabelText('Descrição'), ' novo');

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descartar' }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
