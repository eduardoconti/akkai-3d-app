import { useSyncExternalStore } from 'react';
import {
  checkApiConnectivity,
  setNetworkActivityListener,
} from '@/shared/lib/api/http-client';

const ONLINE_CHECK_INTERVAL_MS = 3 * 60 * 1000;
// Offline a reconexão precisa ser percebida logo: é ela que dispara a
// sincronização das vendas guardadas no aparelho.
const OFFLINE_CHECK_INTERVAL_MS = 15 * 1000;

function getNavigatorOnlineState() {
  return typeof window === 'undefined' ? true : window.navigator.onLine;
}

type Listener = () => void;

let currentStatus = getNavigatorOnlineState();
let checkTimeoutId: number | null = null;
const listeners = new Set<Listener>();
let initialized = false;

function setStatus(nextStatus: boolean) {
  if (currentStatus === nextStatus) {
    return;
  }

  currentStatus = nextStatus;
  listeners.forEach((listener) => listener());
}

function scheduleNextCheck() {
  if (checkTimeoutId !== null) {
    window.clearTimeout(checkTimeoutId);
  }

  checkTimeoutId = window.setTimeout(
    () => {
      void updateApiStatus();
    },
    currentStatus ? ONLINE_CHECK_INTERVAL_MS : OFFLINE_CHECK_INTERVAL_MS,
  );
}

async function updateApiStatus() {
  if (!getNavigatorOnlineState()) {
    setStatus(false);
  } else {
    setStatus(await checkApiConnectivity());
  }

  if (initialized) {
    scheduleNextCheck();
  }
}

function handleBrowserOffline() {
  setStatus(false);
  scheduleNextCheck();
}

function handleRecheck() {
  void updateApiStatus();
}

function handleNetworkActivity(reachable: boolean) {
  const previousStatus = currentStatus;
  setStatus(reachable);

  // Uma falha de requisição derruba o status na hora; o intervalo curto de
  // verificação traz o app de volta assim que a API responder de novo.
  if (previousStatus !== reachable && initialized) {
    scheduleNextCheck();
  }
}

function startMonitoring() {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  setNetworkActivityListener(handleNetworkActivity);
  window.addEventListener('online', handleRecheck);
  window.addEventListener('offline', handleBrowserOffline);
  window.addEventListener('focus', handleRecheck);

  void updateApiStatus();
}

function stopMonitoring() {
  if (typeof window === 'undefined') {
    return;
  }

  if (checkTimeoutId !== null) {
    window.clearTimeout(checkTimeoutId);
    checkTimeoutId = null;
  }

  setNetworkActivityListener(null);
  window.removeEventListener('online', handleRecheck);
  window.removeEventListener('offline', handleBrowserOffline);
  window.removeEventListener('focus', handleRecheck);

  initialized = false;
}

function subscribe(listener: Listener) {
  startMonitoring();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stopMonitoring();
    }
  };
}

function getSnapshot() {
  return currentStatus;
}

function getServerSnapshot() {
  return true;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
