import * as Tone from 'tone';

export type LayerName =
  | 'wind'
  | 'birds'
  | 'insects'
  | 'crickets'
  | 'water'
  | 'vegetation';

export interface AudioLayer {
  name: LayerName;
  source: Tone.ToneAudioNode;
  gain: Tone.Gain;
  start: () => void;
  stop: () => void;
}

export function createWindLayer(): AudioLayer {
  const noise = new Tone.Noise('brown');
  const filter = new Tone.Filter(380, 'lowpass');
  const gain = new Tone.Gain(0);
  noise.connect(filter);
  filter.connect(gain);
  return {
    name: 'wind',
    source: noise,
    gain,
    start: () => noise.start(),
    stop: () => noise.stop(),
  };
}

export function createBirdsLayer(): AudioLayer {
  const synth = new Tone.FMSynth({
    harmonicity: 8,
    modulationIndex: 2,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
  });
  const gain = new Tone.Gain(0);
  synth.connect(gain);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    name: 'birds',
    source: synth,
    gain,
    start: () => {
      intervalId = setInterval(
        () => {
          if (gain.gain.value > 0.01) {
            const note = ['C5', 'E5', 'G5', 'A5'][
              Math.floor(Math.random() * 4)
            ];
            synth.triggerAttackRelease(note, '16n');
          }
        },
        800 + Math.random() * 2000,
      );
    },
    stop: () => {
      if (intervalId) clearInterval(intervalId);
    },
  };
}

export function createInsectsLayer(): AudioLayer {
  const noise = new Tone.Noise('white');
  const filter = new Tone.Filter({ frequency: 5200, type: 'bandpass', Q: 8 });
  const gain = new Tone.Gain(0);
  noise.connect(filter);
  filter.connect(gain);
  return {
    name: 'insects',
    source: noise,
    gain,
    start: () => noise.start(),
    stop: () => noise.stop(),
  };
}

export function createCricketsLayer(): AudioLayer {
  const osc = new Tone.Oscillator({ frequency: 2400, type: 'square' });
  const tremolo = new Tone.Tremolo({ frequency: 8, depth: 0.8 }).start();
  const gain = new Tone.Gain(0);
  osc.connect(tremolo);
  tremolo.connect(gain);
  return {
    name: 'crickets',
    source: osc,
    gain,
    start: () => osc.start(),
    stop: () => osc.stop(),
  };
}

export function createWaterLayer(): AudioLayer {
  const noise = new Tone.Noise('brown');
  const filter = new Tone.Filter(240, 'lowpass');
  const gain = new Tone.Gain(0);
  noise.connect(filter);
  filter.connect(gain);
  return {
    name: 'water',
    source: noise,
    gain,
    start: () => noise.start(),
    stop: () => noise.stop(),
  };
}

export function createVegetationLayer(): AudioLayer {
  const noise = new Tone.Noise('pink');
  const filter = new Tone.Filter({ frequency: 620, type: 'bandpass', Q: 4 });
  const gain = new Tone.Gain(0);
  noise.connect(filter);
  filter.connect(gain);
  return {
    name: 'vegetation',
    source: noise,
    gain,
    start: () => noise.start(),
    stop: () => noise.stop(),
  };
}

export function createAllLayers(): AudioLayer[] {
  return [
    createWindLayer(),
    createBirdsLayer(),
    createInsectsLayer(),
    createCricketsLayer(),
    createWaterLayer(),
    createVegetationLayer(),
  ];
}
