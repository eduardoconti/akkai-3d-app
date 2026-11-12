import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RequirePermission from './require-permission';

const useAuthMock = vi.fn();

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

function renderGuard() {
  render(
    <MemoryRouter initialEntries={['/administracao']}>
      <Routes>
        <Route path="/" element={<p>Início</p>} />
        <Route
          path="/administracao"
          element={
            <RequirePermission permission="usuario.administrar-permissoes">
              <p>Painel</p>
            </RequirePermission>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequirePermission', () => {
  it('exibe a tela para quem possui a permissão', () => {
    useAuthMock.mockReturnValue({
      user: { permissions: ['usuario.administrar-permissoes'] },
    });

    renderGuard();

    expect(screen.getByText('Painel')).toBeInTheDocument();
  });

  it('leva ao início quem não possui a permissão', () => {
    useAuthMock.mockReturnValue({ user: { permissions: ['venda.ler'] } });

    renderGuard();

    expect(screen.queryByText('Painel')).not.toBeInTheDocument();
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('leva ao início quando não há usuário carregado', () => {
    useAuthMock.mockReturnValue({ user: null });

    renderGuard();

    expect(screen.getByText('Início')).toBeInTheDocument();
  });
});
