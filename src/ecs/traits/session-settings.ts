import { trait } from 'koota';

export type RenderQuality = 'low' | 'medium' | 'high';

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
}

export interface DisplaySettings {
  renderQuality: RenderQuality;
  shadows: boolean;
  viewDistance: number;
  fullscreen: boolean;
  postProcessing: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  ambientVolume: 0.6,
};

export const DEFAULT_DISPLAY: DisplaySettings = {
  renderQuality: 'medium',
  shadows: true,
  viewDistance: 1,
  fullscreen: false,
  postProcessing: true,
};

/**
 * Session-scoped user preferences (audio, display).
 *
 * Persisted to Capacitor Preferences via `loadSettings()` /
 * `setAudioSetting()` / `setDisplaySetting()` in `@/ecs/actions/settings`.
 */
export const SettingsConfig = trait(() => ({
  audio: { ...DEFAULT_AUDIO } as AudioSettings,
  display: { ...DEFAULT_DISPLAY } as DisplaySettings,
}));
