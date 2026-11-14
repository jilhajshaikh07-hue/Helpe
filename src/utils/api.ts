import { Capacitor } from '@capacitor/core';

const DEFAULT_NATIVE_API_BASE =
  'https://ais-pre-jgzozgsujqj25h63nmy7xf-995231659222.asia-southeast1.run.app';

export function getApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) {
    return configured;
  }
  if (Capacitor.isNativePlatform()) {
    return DEFAULT_NATIVE_API_BASE;
  }
  return '';
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function wsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (base) {
    return `${base.replace(/^http/, 'ws')}${normalizedPath}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${normalizedPath}`;
}
