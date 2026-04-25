import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import i18n from '../i18n/config';

beforeEach(async () => {
  if (i18n.language !== 'ru') {
    await i18n.changeLanguage('ru');
  }
});

// Mock fetch globally
if (typeof window !== 'undefined') {
  window.fetch = vi.fn() as unknown as typeof window.fetch;
}

// Fix localStorage.clear in jsdom environment
if (typeof window !== 'undefined') {
  // jsdom provides localStorage but clear() may not work properly
  // Replace with a working implementation
  const storage: Record<string, string> = {};

  const localStorageMock = {
    getItem(key: string) {
      return storage[key] || null;
    },
    setItem(key: string, value: string) {
      storage[key] = String(value);
    },
    removeItem(key: string) {
      delete storage[key];
    },
    clear() {
      Object.keys(storage).forEach((key) => {
        delete storage[key];
      });
    },
    key(index: number) {
      return Object.keys(storage)[index] || null;
    },
    get length() {
      return Object.keys(storage).length;
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}
