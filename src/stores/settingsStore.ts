/**
 * Settings store — persisted to localStorage.
 *
 * Holds user preferences for audio, display, and controls.
 * Loaded once on app start, written on every change.
 */

import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────────────────

export type RenderQuality = 'low' | 'medium' | 'high';

export interface AudioSettings {
  masterVolume: number; // 0-1
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
}

export interface DisplaySettings {
  renderQuality: RenderQuality;
  shadows: boolean;
  viewDistance: number; // 1-3 (chunk radius)
  fullscreen: boolean;
  postProcessing: boolean;
}

export interface SettingsState {
  audio: AudioSettings;
  display: DisplaySettings;

  // Actions
  setAudioSetting: <K extends keyof AudioSettings>(
    key: K,
    value: AudioSettings[K],
  ) => void;
  setDisplaySetting: <K extends keyof DisplaySettings>(
    key: K,
    value: DisplaySettings[K],
  ) => void;
  resetDefaults: () => void;
}

// ── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_AUDIO: AudioSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  ambientVolume: 0.6,
};

const DEFAULT_DISPLAY: DisplaySettings = {
  renderQuality: 'medium',
  shadows: true,
  viewDistance: 1,
  fullscreen: false,
  postProcessing: true,
};

// ── localStorage persistence ─────────────────────────────────────────────

const STORAGE_KEY = 'kings-road:settings';

function loadFromStorage(): { audio: AudioSettings; display: DisplaySettings } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        audio: { ...DEFAULT_AUDIO, ...(parsed.audio ?? {}) },
        display: { ...DEFAULT_DISPLAY, ...(parsed.display ?? {}) },
      };
    }
  } catch {
    // corrupt or unavailable — use defaults
  }
  return { audio: DEFAULT_AUDIO, display: DEFAULT_DISPLAY };
}

function saveToStorage(audio: AudioSettings, display: DisplaySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ audio, display }));
  } catch {
    // localStorage full or unavailable
  }
}

// ── Store ────────────────────────────────────────────────────────────────

const initial = loadFromStorage();

export const useSettingsStore = create<SettingsState>((set) => ({
  audio: initial.audio,
  display: initial.display,

  setAudioSetting: (key, value) => {
    set((state) => {
      const audio = { ...state.audio, [key]: value };
      saveToStorage(audio, state.display);
      return { audio };
    });
  },

  setDisplaySetting: (key, value) => {
    set((state) => {
      const display = { ...state.display, [key]: value };
      saveToStorage(state.audio, display);
      return { display };
    });
  },

  resetDefaults: () => {
    saveToStorage(DEFAULT_AUDIO, DEFAULT_DISPLAY);
    set({ audio: DEFAULT_AUDIO, display: DEFAULT_DISPLAY });
  },
}));
