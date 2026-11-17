import type { Alerta, TipoAlerta } from '@/shared/lib/types/domain';

/** Alertas dispensados: tipo → `chave` do estado no momento em que foi dispensado. */
export type DismissedAlerts = Partial<Record<TipoAlerta, string>>;

const STORAGE_PREFIX = 'akkai:alertas-dispensados:';

function storageKey(userId: number) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadDismissedAlerts(userId: number): DismissedAlerts {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : {};

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ) as DismissedAlerts;
  } catch {
    return {};
  }
}

export function saveDismissedAlerts(
  userId: number,
  dismissed: DismissedAlerts,
): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(dismissed));
  } catch {
    // Sem armazenamento (aba anônima, cota cheia): vale só nesta sessão.
  }
}

/** Um alerta dispensado volta a aparecer quando o estado dele muda. */
export function isAlertDismissed(
  alerta: Alerta,
  dismissed: DismissedAlerts,
): boolean {
  return dismissed[alerta.tipo] === alerta.chave;
}
