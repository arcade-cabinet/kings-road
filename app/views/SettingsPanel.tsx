/**
 * SettingsPanel — tabbed settings UI with Audio, Display, and Controls.
 *
 * Styled as a medieval parchment panel consistent with the PauseMenu.
 * State is read from the Koota SettingsConfig trait; writes go through
 * the action functions in `@/ecs/actions/settings`, which persist to
 * Capacitor Preferences (localStorage on web, native stores on mobile).
 */

import { useTrait } from 'koota/react';
import { useState } from 'react';
import {
  resetSettingsDefaults,
  setAudioSetting,
  setDisplaySetting,
} from '@/ecs/actions/settings';
import {
  DEFAULT_AUDIO,
  DEFAULT_DISPLAY,
  type RenderQuality,
  SettingsConfig,
} from '@/ecs/traits/session-settings';
import { getSessionEntity } from '@/ecs/world';
import { cn } from '@/lib/utils';

function useSettings() {
  const settings = useTrait(getSessionEntity(), SettingsConfig);
  return settings ?? { audio: DEFAULT_AUDIO, display: DEFAULT_DISPLAY };
}

// ── Shared UI primitives ─────────────────────────────────────────────────

const PARCHMENT_BG =
  'bg-gradient-to-b from-yellow-50/95 to-yellow-100/90 border border-yellow-700/30';
const ACCENT = '#8b6f47';
const ACCENT_40 = '#8b6f4740';
const TEXT = '#3d3a34';

function PanelButton({
  label,
  onClick,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  const [hovering, setHovering] = useState(false);

  const baseClasses =
    variant === 'danger'
      ? 'border-rose-700/40 bg-rose-50/60 text-rose-900'
      : 'border-yellow-700/40 bg-yellow-100/60 text-yellow-900';

  const hoverClasses =
    variant === 'danger'
      ? 'border-rose-600/70 bg-rose-100/80 text-rose-950'
      : 'border-yellow-600/70 bg-yellow-200/80 text-yellow-950';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        'relative w-full border px-6 py-3',
        'font-lora text-sm font-semibold tracking-wider uppercase',
        'transition-all duration-200 cursor-pointer overflow-hidden',
        hovering ? hoverClasses : baseClasses,
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-500',
          hovering && 'translate-x-full',
        )}
      />
      <span className="relative">{label}</span>
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center justify-between py-2 px-2 gap-4">
      <span
        className="font-crimson text-sm min-w-[100px]"
        style={{ color: TEXT }}
      >
        {label}
      </span>
      <div className="flex items-center gap-3 flex-1 max-w-[200px]">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none cursor-pointer rounded-sm"
          style={{
            background: `linear-gradient(to right, ${ACCENT} ${pct}%, ${ACCENT_40} ${pct}%)`,
          }}
        />
        <span
          className="font-lora text-xs font-semibold min-w-[32px] text-right"
          style={{ color: TEXT }}
        >
          {Math.round(value * 100)}%
        </span>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-2">
      <span className="font-crimson text-sm" style={{ color: TEXT }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer relative',
          value ? 'bg-yellow-600/70' : 'bg-yellow-900/20',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-yellow-50 shadow transition-transform duration-200',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-2">
      <span className="font-crimson text-sm" style={{ color: TEXT }}>
        {label}
      </span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'font-lora text-xs px-3 py-1 border transition-colors cursor-pointer',
              value === opt.value
                ? 'border-yellow-600/70 bg-yellow-200/80 text-yellow-950 font-bold'
                : 'border-yellow-700/25 bg-yellow-100/40 text-yellow-800/70',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-3 first:mt-0 mb-1.5">
      <span
        className="font-lora text-[11px] uppercase tracking-[0.2em] font-semibold"
        style={{ color: ACCENT }}
      >
        {title}
      </span>
      <div
        className="h-px mt-0.5"
        style={{
          background: `linear-gradient(to right, ${ACCENT_40}, transparent 80%)`,
        }}
      />
    </div>
  );
}

type SettingsTab = 'audio' | 'display' | 'controls';

function TabBar({
  active,
  onChange,
}: {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}) {
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'audio', label: 'Audio' },
    { id: 'display', label: 'Display' },
    { id: 'controls', label: 'Controls' },
  ];

  return (
    <div className="flex gap-0 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 py-2 font-lora text-xs font-semibold tracking-[0.15em] uppercase transition-colors cursor-pointer border-b-2',
            active === tab.id
              ? 'border-yellow-600/70 text-yellow-900'
              : 'border-transparent text-yellow-700/50 hover:text-yellow-800/70',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function AudioTab() {
  const { audio } = useSettings();

  return (
    <div className="flex flex-col gap-0.5">
      <Slider
        label="Master Volume"
        value={audio.masterVolume}
        onChange={(v) => setAudioSetting('masterVolume', v)}
      />
      <Slider
        label="Music"
        value={audio.musicVolume}
        onChange={(v) => setAudioSetting('musicVolume', v)}
      />
      <Slider
        label="Sound Effects"
        value={audio.sfxVolume}
        onChange={(v) => setAudioSetting('sfxVolume', v)}
      />
      <Slider
        label="Ambient"
        value={audio.ambientVolume}
        onChange={(v) => setAudioSetting('ambientVolume', v)}
      />
    </div>
  );
}

function DisplayTab() {
  const { display } = useSettings();

  const handleFullscreen = (v: boolean) => {
    setDisplaySetting('fullscreen', v);
    if (v) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      <Select<RenderQuality>
        label="Quality"
        value={display.renderQuality}
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Med' },
          { value: 'high', label: 'High' },
        ]}
        onChange={(v) => setDisplaySetting('renderQuality', v)}
      />
      <Toggle
        label="Shadows"
        value={display.shadows}
        onChange={(v) => setDisplaySetting('shadows', v)}
      />
      <Select<'1' | '2' | '3'>
        label="View Distance"
        value={String(display.viewDistance) as '1' | '2' | '3'}
        options={[
          { value: '1', label: 'Near' },
          { value: '2', label: 'Normal' },
          { value: '3', label: 'Far' },
        ]}
        onChange={(v) => setDisplaySetting('viewDistance', Number(v))}
      />
      <Toggle
        label="Fullscreen"
        value={display.fullscreen}
        onChange={handleFullscreen}
      />
    </div>
  );
}

const KEYBINDINGS: Array<{ key: string; action: string; group: string }> = [
  { key: 'W A S D', action: 'Move', group: 'Movement' },
  { key: 'Mouse', action: 'Look around (pointer lock)', group: 'Movement' },
  { key: 'Space', action: 'Jump', group: 'Movement' },
  { key: 'Shift', action: 'Walk (hold)', group: 'Movement' },
  { key: 'E', action: 'Interact / Talk', group: 'Actions' },
  { key: 'Left Click', action: 'Attack (hold)', group: 'Actions' },
  { key: 'I', action: 'Inventory', group: 'Actions' },
  { key: 'Q', action: 'Quest log', group: 'Actions' },
  { key: 'ESC', action: 'Pause menu', group: 'System' },
  { key: 'Gamepad', action: 'Full controller support', group: 'System' },
];

function ControlsTab() {
  let lastGroup = '';

  return (
    <div className="flex flex-col gap-0.5">
      {KEYBINDINGS.map((binding) => {
        const showGroupHeader = binding.group !== lastGroup;
        lastGroup = binding.group;

        return (
          <div key={`${binding.group}-${binding.key}`}>
            {showGroupHeader && <SectionHeader title={binding.group} />}

            <div className="flex items-center justify-between py-1.5 px-2">
              <span className="font-crimson text-sm" style={{ color: TEXT }}>
                {binding.action}
              </span>
              <span
                className="font-lora text-xs font-semibold tracking-wider px-2.5 py-1 border"
                style={{
                  color: TEXT,
                  backgroundColor: 'rgba(245, 240, 232, 0.8)',
                  borderColor: 'rgba(139, 111, 71, 0.25)',
                }}
              >
                {binding.key}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SettingsPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<SettingsTab>('audio');

  return (
    <div
      className={cn(
        'relative px-10 py-8 shadow-2xl w-[420px] max-h-[80vh] flex flex-col',
        PARCHMENT_BG,
      )}
    >
      <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
      <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

      <h2
        className="font-lora text-2xl font-bold tracking-[0.08em] text-center mb-4"
        style={{
          color: ACCENT,
          textShadow: '0 0 20px rgba(196, 167, 71, 0.15)',
        }}
      >
        Settings
      </h2>

      <TabBar active={tab} onChange={setTab} />

      <div className="flex-1 overflow-y-auto min-h-0 mb-4">
        {tab === 'audio' && <AudioTab />}
        {tab === 'display' && <DisplayTab />}
        {tab === 'controls' && <ControlsTab />}
      </div>

      <div className="flex flex-col gap-2">
        <PanelButton
          label="Reset Defaults"
          onClick={resetSettingsDefaults}
          variant="danger"
        />
        <PanelButton label="Back" onClick={onBack} />
      </div>
    </div>
  );
}
