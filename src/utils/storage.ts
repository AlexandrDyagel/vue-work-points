import { Preferences } from '@capacitor/preferences';

/**
 * Проверяет, запущено ли приложение в нативном окружении Capacitor
 */
function isNative(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined';
}

/**
 * Абстрактный слой хранения ключ-значение.
 * В нативном окружении (Android/iOS) использует @capacitor/preferences (SharedPreferences/UserDefaults),
 * в web-окружении — localStorage.
 */
export const storage = {
  async get<T = string>(key: string): Promise<T | null> {
    if (isNative()) {
      const { value } = await Preferences.get({ key });
      return value ? (JSON.parse(value) as T) : null;
    } else {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    }
  },

  async set<T = string>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    if (isNative()) {
      await Preferences.set({ key, value: serialized });
    } else {
      localStorage.setItem(key, serialized);
    }
  },

  async remove(key: string): Promise<void> {
    if (isNative()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async keys(): Promise<string[]> {
    if (isNative()) {
      const result = await Preferences.keys();
      return result.keys;
    } else {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    }
  },
};
