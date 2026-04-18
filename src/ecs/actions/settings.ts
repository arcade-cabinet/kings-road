import {
  type AudioSettings,
  DEFAULT_AUDIO,
  DEFAULT_DISPLAY,
  type DisplaySettings,
  SettingsConfig,
} from '@/ecs/traits/session-settings';
import { getSessionEntity } from '@/ecs/world';
import { getPreferenceJSON, setPreferenceJSON } from '@/platform/preferences';

const STORAGE_KEY = 'kings-road:settings';

type StoredSettings = {
  audio?: Partial<AudioSettings>;
  display?: Partial<DisplaySettings>;
};

type SessionProxy = {
  has: (t: typeof SettingsConfig) => boolean;
  add: (t: typeof SettingsConfig) => void;
  get: (t: typeof SettingsConfig) => {
    audio: AudioSettings;
    display: DisplaySettings;
  };
  set: (
    t: typeof SettingsConfig,
    value: { audio: AudioSettings; display: DisplaySettings },
  ) => void;
};

function ensureAttached(): SessionProxy {
  const session = getSessionEntity() as unknown as SessionProxy;
  if (!session.has(SettingsConfig)) {
    session.add(SettingsConfig);
  }
  return session;
}

/** Load persisted settings from Capacitor Preferences and attach to the session entity. */
export async function loadSettings(): Promise<void> {
  const session = ensureAttached();
  const stored = await getPreferenceJSON<StoredSettings>(STORAGE_KEY);
  const audio: AudioSettings = { ...DEFAULT_AUDIO, ...(stored?.audio ?? {}) };
  const display: DisplaySettings = {
    ...DEFAULT_DISPLAY,
    ...(stored?.display ?? {}),
  };
  session.set(SettingsConfig, { audio, display });
}

async function persist(
  audio: AudioSettings,
  display: DisplaySettings,
): Promise<void> {
  try {
    await setPreferenceJSON(STORAGE_KEY, { audio, display });
  } catch {
    // storage unavailable — in-memory state still wins this session
  }
}

export function setAudioSetting<K extends keyof AudioSettings>(
  key: K,
  value: AudioSettings[K],
): void {
  const session = ensureAttached();
  const cur = session.get(SettingsConfig);
  const audio = { ...cur.audio, [key]: value };
  session.set(SettingsConfig, { audio, display: cur.display });
  void persist(audio, cur.display);
}

export function setDisplaySetting<K extends keyof DisplaySettings>(
  key: K,
  value: DisplaySettings[K],
): void {
  const session = ensureAttached();
  const cur = session.get(SettingsConfig);
  const display = { ...cur.display, [key]: value };
  session.set(SettingsConfig, { audio: cur.audio, display });
  void persist(cur.audio, display);
}

export function resetSettingsDefaults(): void {
  const session = ensureAttached();
  const audio = { ...DEFAULT_AUDIO };
  const display = { ...DEFAULT_DISPLAY };
  session.set(SettingsConfig, { audio, display });
  void persist(audio, display);
}
