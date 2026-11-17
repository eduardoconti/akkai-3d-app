import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOTIFICATIONS_REFRESH_MS,
  isNotificationsDataStale,
  useNotificationsPolling,
} from './use-notifications-polling';
import { useNotificationsStore } from './use-notifications-store';

const { listAlertsMock } = vi.hoisted(() => ({ listAlertsMock: vi.fn() }));

vi.mock('@/features/notifications/api/notifications-api', () => ({
  listAlerts: () => listAlertsMock(),
}));

describe('isNotificationsDataStale', () => {
  it('considera desatualizado sem busca anterior ou além do limite', () => {
    expect(isNotificationsDataStale(null, 1000, 5000)).toBe(true);
    expect(isNotificationsDataStale(3000, 1000, 5000)).toBe(true);
    expect(isNotificationsDataStale(4500, 1000, 5000)).toBe(false);
  });
});

describe('useNotificationsPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listAlertsMock.mockReset();
    listAlertsMock.mockResolvedValue({ total: 0, alertas: [] });
    useNotificationsStore.setState({
      alertas: [],
      dismissed: {},
      userId: null,
      isFetching: false,
      hasFetchError: false,
      lastFetchedAt: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('busca ao entrar e de tempos em tempos enquanto online', async () => {
    const { unmount } = renderHook(() => useNotificationsPolling(1, true));

    expect(listAlertsMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_REFRESH_MS);
    expect(listAlertsMock).toHaveBeenCalledTimes(2);

    unmount();
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_REFRESH_MS);
    expect(listAlertsMock).toHaveBeenCalledTimes(2);
  });

  it('não busca offline nem sem usuário logado', async () => {
    renderHook(() => useNotificationsPolling(1, false));
    renderHook(() => useNotificationsPolling(null, true));

    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_REFRESH_MS);
    expect(listAlertsMock).not.toHaveBeenCalled();
  });

  it('ao voltar para a aba, só busca se a lista estiver antiga', async () => {
    renderHook(() => useNotificationsPolling(1, true));
    await vi.advanceTimersByTimeAsync(0);
    expect(listAlertsMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('focus'));
    expect(listAlertsMock).toHaveBeenCalledTimes(1);

    useNotificationsStore.setState({ lastFetchedAt: Date.now() - 120_000 });
    window.dispatchEvent(new Event('focus'));
    expect(listAlertsMock).toHaveBeenCalledTimes(2);
  });
});
