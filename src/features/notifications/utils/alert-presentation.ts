import type { Alerta, ItemAlerta } from '@/shared/lib/types/domain';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relativeTimeFormat = new Intl.RelativeTimeFormat('pt-BR', {
  numeric: 'auto',
});

/** "há 3 dias", "há 5 horas", "agora" — a partir de uma data ISO 8601. */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime();

  if (Number.isNaN(time)) {
    return '';
  }

  const elapsed = Math.max(0, now - time);

  if (elapsed < MINUTE) {
    return 'agora';
  }

  if (elapsed < HOUR) {
    return relativeTimeFormat.format(-Math.floor(elapsed / MINUTE), 'minute');
  }

  if (elapsed < DAY) {
    return relativeTimeFormat.format(-Math.floor(elapsed / HOUR), 'hour');
  }

  return relativeTimeFormat.format(-Math.floor(elapsed / DAY), 'day');
}

/** Tela onde o usuário resolve o alerta como um todo. */
export function getAlertDestination(alerta: Alerta): string {
  switch (alerta.tipo) {
    case 'ORCAMENTO_PENDENTE':
      return '/orcamentos?status=PENDENTE';
    case 'CAIXA_ABERTO_PROLONGADO':
      return '/financeiro/caixas';
    case 'ESTOQUE_NEGATIVO':
      return '/produtos?ordenarPor=nivelEstoque&direcao=asc';
  }
}

/** Tela de um item do alerta (ex.: a lista de produtos filtrada por ele). */
export function getAlertItemDestination(
  alerta: Alerta,
  item: ItemAlerta,
): string {
  if (alerta.tipo === 'ESTOQUE_NEGATIVO') {
    const params = new URLSearchParams({
      ordenarPor: 'nivelEstoque',
      direcao: 'asc',
      termo: item.titulo,
    });
    return `/produtos?${params.toString()}`;
  }

  return getAlertDestination(alerta);
}
