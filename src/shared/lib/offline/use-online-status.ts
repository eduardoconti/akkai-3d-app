import { useSyncExternalStore } from 'react';
import { checkApiConnectivity } from '@/shared/lib/api/http-client';

function getNavigatorOnlineState() {
  return typeof window === 'undefined' ? true : window.navigator.onLine;
}

type Listener = () => void;

let currentStatus = false;
let pollingIntervalId: number | null = null;
const listeners = new Set<Listener>();
let initialized = false;
let handleOnlineRef: (() => void) | null = null;
let handleOfflineRef: (() => void) | null = null;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

async function updateApiStatus() {
  if (!getNavigatorOnlineState()) {
    if (currentStatus !== false) {
      currentStatus = false;
      notifyListeners();
    }
    return;
  }

  const apiReachable = await checkApiConnectivity();

  if (currentStatus !== apiReachable) {
    currentStatus = apiReachable;
    notifyListeners();
  }
}

function startMonitoring() {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  handleOnlineRef = () => {
    void updateApiStatus();
  };

  handleOfflineRef = () => {
    if (currentStatus !== false) {
      currentStatus = false;
      notifyListeners();
    }
  };

  void updateApiStatus();

  const THREE_MIN_MS = 3 * 60 * 1000;
  pollingIntervalId = window.setInterval(() => {
    void updateApiStatus();
  }, THREE_MIN_MS);

  window.addEventListener('online', handleOnlineRef);
  window.addEventListener('offline', handleOfflineRef);
  window.addEventListener('focus', handleOnlineRef);
}

function stopMonitoring() {
  if (typeof window === 'undefined') {
    return;
  }

  if (pollingIntervalId !== null) {
    window.clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }

  if (handleOnlineRef) {
    window.removeEventListener('online', handleOnlineRef);
    window.removeEventListener('focus', handleOnlineRef);
  }

  if (handleOfflineRef) {
    window.removeEventListener('offline', handleOfflineRef);
  }

  handleOnlineRef = null;
  handleOfflineRef = null;
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
