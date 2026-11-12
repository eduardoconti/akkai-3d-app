import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './login-page';

const loginMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('@/features/auth', () => ({
  useAuth: () => useAuthMock(),
}));

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    useAuthMock.mockReturnValue({ login: loginMock, isLoading: false });
  });

  it('mantém o botão ativo e explica os campos inválidos ao enviar', async () => {
    renderLogin();

    const entrar = screen.getByRole('button', { name: 'Entrar' });
    expect(entrar).toBeEnabled();

    await userEvent.click(entrar);

    expect(screen.getByText('Informe o login.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('aplica as regras da API para o login', async () => {
    renderLogin();

    await userEvent.type(screen.getByLabelText('Login'), 'ed1');
    await userEvent.type(screen.getByLabelText('Senha'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      screen.getByText('Use apenas letras, sem espaços, números ou acentos.'),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('envia o login quando os campos são válidos', async () => {
    loginMock.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText('Login'), 'eduardo');
    await userEvent.type(screen.getByLabelText('Senha'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(loginMock).toHaveBeenCalledWith({
      login: 'eduardo',
      password: '123456',
    });
  });

  it('informa que está verificando a sessão enquanto o app inicia', () => {
    useAuthMock.mockReturnValue({ login: loginMock, isLoading: true });
    renderLogin();

    expect(
      screen.getByRole('button', { name: /Verificando sessão/ }),
    ).toBeDisabled();
  });
});
