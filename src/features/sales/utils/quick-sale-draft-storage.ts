import type { SaleFormState } from '@/features/sales/types/sale-form';

export type QuickSaleDraft = {
  id: string;
  label: string;
  form: SaleFormState;
};

export interface StoredQuickSaleDrafts {
  sequence: number;
  drafts: QuickSaleDraft[];
}

const STORAGE_KEY_PREFIX = 'akkai-quick-sale-drafts';
const STORAGE_VERSION = 1;
const MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;
const DRAFT_ID_PATTERN = /^quick-sale-(\d+)-\d+$/;

function getStorageKey(userId: number | string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function isDraftExpired(draft: QuickSaleDraft, now: number): boolean {
  const createdAt = Number(DRAFT_ID_PATTERN.exec(draft.id)?.[1]);

  return !Number.isFinite(createdAt) || now - createdAt > MAX_DRAFT_AGE_MS;
}

function hasFilledItems(form: SaleFormState): boolean {
  return form.itens.some(
    (item) =>
      item.idProduto !== null ||
      item.nomeProduto.trim().length > 0 ||
      item.valorUnitario > 0,
  );
}

function isDraftShape(value: unknown): value is QuickSaleDraft {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const draft = value as Partial<QuickSaleDraft>;

  return (
    typeof draft.id === 'string' &&
    typeof draft.label === 'string' &&
    typeof draft.form === 'object' &&
    draft.form !== null &&
    Array.isArray(draft.form.itens) &&
    Array.isArray(draft.form.pagamentos)
  );
}

/**
 * Recupera os atendimentos de venda rápida salvos para o usuário. Descarta
 * rascunhos vazios, expirados (mais de 24h) ou com formato inválido.
 */
export function loadQuickSaleDrafts(
  userId: number | string | undefined,
  now = Date.now(),
): StoredQuickSaleDrafts {
  const empty: StoredQuickSaleDrafts = { sequence: 0, drafts: [] };

  if (userId === undefined) {
    return empty;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));

    if (!raw) {
      return empty;
    }

    const parsed = JSON.parse(raw) as {
      version?: number;
      sequence?: number;
      drafts?: unknown[];
    };

    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.drafts)) {
      return empty;
    }

    return {
      sequence: typeof parsed.sequence === 'number' ? parsed.sequence : 0,
      drafts: parsed.drafts
        .filter(isDraftShape)
        .filter(
          (draft) => !isDraftExpired(draft, now) && hasFilledItems(draft.form),
        ),
    };
  } catch {
    return empty;
  }
}

export function saveQuickSaleDrafts(
  userId: number | string | undefined,
  { sequence, drafts }: StoredQuickSaleDrafts,
): void {
  if (userId === undefined) {
    return;
  }

  try {
    const storageKey = getStorageKey(userId);

    if (drafts.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ version: STORAGE_VERSION, sequence, drafts }),
    );
  } catch {
    // Armazenamento indisponível (modo privado, cota cheia): segue sem persistir.
  }
}
