import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { buildTheme } from '@/theme/theme';
import StatusChip from './status-chip';

function renderChip(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={buildTheme('light')}>{ui}</ThemeProvider>,
  );
}

describe('StatusChip', () => {
  it('usa o texto escuro do tom para manter o contraste', () => {
    renderChip(<StatusChip label="Ativo" tone="success" />);

    expect(screen.getByText('Ativo').closest('.MuiChip-root')).toHaveStyle({
      color: buildTheme('light').palette.success.dark,
    });
  });

  it('é neutro por padrão', () => {
    renderChip(<StatusChip label="Inativo" />);

    expect(screen.getByText('Inativo').closest('.MuiChip-root')).toHaveStyle({
      color: buildTheme('light').palette.text.secondary,
    });
  });

  it('repassa o clique quando é clicável', async () => {
    const aoClicar = vi.fn();
    renderChip(
      <StatusChip label="Pendente" tone="warning" onClick={aoClicar} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Pendente' }));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });
});
