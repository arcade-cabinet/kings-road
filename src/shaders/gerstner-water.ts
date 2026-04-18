import * as THREE from 'three';

export interface WaveLayer {
  amplitude: number;
  wavelength: number;
  speed: number;
  direction: [number, number];
}

export interface WaterConfig {
  color: string;
  opacity: number;
  waveLayers: WaveLayer[];
  foamThreshold: number;
  celShaded: boolean;
}

const WATER_PRESETS: Record<string, WaterConfig> = {
  river: {
    color: '#2266aa',
    opacity: 0.85,
    waveLayers: [
      { amplitude: 0.15, wavelength: 4.0, speed: 1.2, direction: [0, 1] },
      { amplitude: 0.08, wavelength: 2.0, speed: 0.8, direction: [0.3, 0.7] },
    ],
    foamThreshold: 0.7,
    celShaded: true,
  },
  stream: {
    color: '#3377bb',
    opacity: 0.75,
    waveLayers: [
      { amplitude: 0.08, wavelength: 2.0, speed: 1.5, direction: [0, 1] },
    ],
    foamThreshold: 0.8,
    celShaded: true,
  },
  pond: {
    color: '#2255aa',
    opacity: 0.8,
    waveLayers: [
      { amplitude: 0.05, wavelength: 6.0, speed: 0.4, direction: [1, 0] },
      { amplitude: 0.03, wavelength: 3.0, speed: 0.6, direction: [0, 1] },
    ],
    foamThreshold: 0.9,
    celShaded: true,
  },
};

export function getWaterPreset(type: string): WaterConfig {
  return WATER_PRESETS[type] ?? WATER_PRESETS.pond;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude[4];
  uniform float uWavelength[4];
  uniform float uSpeed[4];
  uniform vec2 uDirection[4];
  uniform int uLayerCount;

  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vUv = uv;
    vec3 pos = position;
    float elevation = 0.0;

    for (int i = 0; i < 4; i++) {
      if (i >= uLayerCount) break;
      float freq = 2.0 * 3.14159 / uWavelength[i];
      float phase = uSpeed[i] * freq * uTime;
      float proj = dot(uDirection[i], pos.xz);

      // Gerstner displacement
      float sinVal = sin(freq * proj + phase);
      float cosVal = cos(freq * proj + phase);

      pos.x += uAmplitude[i] * uDirection[i].x * cosVal;
      pos.z += uAmplitude[i] * uDirection[i].y * cosVal;
      pos.y += uAmplitude[i] * sinVal;
      elevation += uAmplitude[i] * sinVal;
    }

    vElevation = elevation;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFoamThreshold;
  uniform float uTime;
  uniform bool uCelShaded;

  varying vec2 vUv;
  varying float vElevation;

  void main() {
    vec3 color = uColor;

    if (uCelShaded) {
      // Quantize to 4 color bands for Wind Waker style
      float band = floor(vElevation * 8.0 + 4.0) / 8.0;
      color = mix(uColor * 0.7, uColor * 1.3, band);

      // Cel-shaded foam at crests
      if (vElevation > uFoamThreshold * 0.1) {
        color = mix(color, vec3(0.9, 0.95, 1.0), smoothstep(uFoamThreshold * 0.1, uFoamThreshold * 0.15, vElevation));
      }
    } else {
      // Simple depth-based color variation
      color = mix(uColor * 0.8, uColor * 1.2, vElevation + 0.5);
    }

    // Caustics — additive sine interference
    float caustic = sin(vUv.x * 20.0 + uTime) * sin(vUv.y * 20.0 + uTime * 0.7);
    caustic = max(0.0, caustic) * 0.15;
    color += vec3(caustic * 0.5, caustic * 0.7, caustic);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

export function createWaterMaterial(config: WaterConfig): THREE.ShaderMaterial {
  const color = new THREE.Color(config.color);
  const amplitudes = new Float32Array(4);
  const wavelengths = new Float32Array(4);
  const speeds = new Float32Array(4);
  const directions: THREE.Vector2[] = [];

  for (let i = 0; i < 4; i++) {
    if (i < config.waveLayers.length) {
      const layer = config.waveLayers[i];
      amplitudes[i] = layer.amplitude;
      wavelengths[i] = layer.wavelength;
      speeds[i] = layer.speed;
      directions.push(
        new THREE.Vector2(layer.direction[0], layer.direction[1]).normalize(),
      );
    } else {
      amplitudes[i] = 0;
      wavelengths[i] = 1;
      speeds[i] = 0;
      directions.push(new THREE.Vector2(0, 1));
    }
  }

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color },
      uOpacity: { value: config.opacity },
      uFoamThreshold: { value: config.foamThreshold },
      uCelShaded: { value: config.celShaded },
      uLayerCount: { value: config.waveLayers.length },
      uAmplitude: { value: amplitudes },
      uWavelength: { value: wavelengths },
      uSpeed: { value: speeds },
      uDirection: { value: directions },
    },
  });
}
