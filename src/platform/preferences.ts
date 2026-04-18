import { Preferences } from '@capacitor/preferences';

/**
 * Unified preferences API: Capacitor Preferences on every platform.
 *
 * On web the plugin transparently maps to localStorage; on iOS/Android
 * it uses UserDefaults / SharedPreferences. Always async — never branch
 * by platform in callers.
 */

export async function getPreference(key: string): Promise<string | null> {
  const { value } = await Preferences.get({ key });
  return value ?? null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  await Preferences.set({ key, value });
}

export async function removePreference(key: string): Promise<void> {
  await Preferences.remove({ key });
}

export async function clearPreferences(): Promise<void> {
  await Preferences.clear();
}

export async function getPreferenceJSON<T>(key: string): Promise<T | null> {
  const raw = await getPreference(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setPreferenceJSON<T>(
  key: string,
  value: T,
): Promise<void> {
  await setPreference(key, JSON.stringify(value));
}
