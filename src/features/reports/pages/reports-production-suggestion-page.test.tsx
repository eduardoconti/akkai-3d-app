import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductionSuggestionReportResponse } from '@/features/reports/api/reports-api';
import ReportsProductionSuggestionPage from './reports-production-suggestion-page';

const getProductionSuggestionReportMock = vi.fn();

vi.mock('@/features/reports/api/reports-api', () => ({
  getProductionSuggestionReport: (...args: unknown[]) =>
    getProductionSuggestionReportMock(...args),
}));

function buildResponse(
  overrides: Partial<ProductionSuggestionReportResponse> = {},
): ProductionSuggestionReportResponse {
  return {
    dataInicio: '2026-04-04',
    dataFim: '2026-04-26',
    feirasHistorico: 8,
    feirasConsideradas: 8,
    feirasPlanejamento: 2,
    feirasEstoqueSeguranca: 1,
    apenasCoberturaInsuficiente: false,
    pagina: 1,
    tamanhoPagina: 25,
    totalItens: 1,
    totalPaginas: 1,
    totalQuantidadeSugerida: 15,
    itens: [
      {
        idProduto: 1,
        codigo: 3001,
        nome: 'Cubo Infinito',
        categoria: null,
        estoqueAtual: 0,
        estoqueMinimo: 0,
        quantidadeVendida: 10,
        feirasConsideradas: 2,
        feirasSemEstoque: 3,
        mediaVendaPorFeira: 5,
        demandaPlanejada: 10,
        estoqueSeguranca: 5,
        estoqueAlvo: 15,
        feirasCobertura: 0,
        sugestaoProducao: 15,
        prioridade: 'CRITICO',
      },
    ],
    ...overrides,
  };
}

describe('ReportsProductionSuggestionPage', () => {
  beforeEach(() => {
    getProductionSuggestionReportMock.mockReset();
  });

  it('carrega com o filtro de cobertura desligado e mostra feiras consideradas e em falta', async () => {
    getProductionSuggestionReportMock.mockResolvedValue(buildResponse());

    render(<ReportsProductionSuggestionPage />);

    await waitFor(() =>
      expect(getProductionSuggestionReportMock).toHaveBeenCalledWith(
        expect.objectContaining({ apenasCoberturaInsuficiente: false }),
      ),
    );
    expect((await screen.findAllByText('em 2 feiras')).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('3 feiras').length).toBeGreaterThan(0);
    expect(
      screen.queryByText('Só cobertura insuficiente', {
        selector: 'span.MuiChip-label',
      }),
    ).not.toBeInTheDocument();
  });

  it('envia o filtro de cobertura insuficiente ao pesquisar', async () => {
    getProductionSuggestionReportMock
      .mockResolvedValueOnce(buildResponse())
      .mockResolvedValueOnce(
        buildResponse({ apenasCoberturaInsuficiente: true }),
      );

    render(<ReportsProductionSuggestionPage />);
    await waitFor(() =>
      expect(getProductionSuggestionReportMock).toHaveBeenCalledTimes(1),
    );

    await userEvent.click(
      screen.getByRole('switch', { name: 'Só cobertura insuficiente' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /pesquisar/i }));

    await waitFor(() =>
      expect(getProductionSuggestionReportMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ apenasCoberturaInsuficiente: true }),
      ),
    );
    expect(
      await screen.findByText('Só cobertura insuficiente', {
        selector: 'span.MuiChip-label',
      }),
    ).toBeInTheDocument();
  });
});
