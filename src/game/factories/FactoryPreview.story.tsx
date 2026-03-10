/**
 * Preview components for factory visual testing — used by Playwright CT.
 *
 * These render 2D previews of factory output so we can screenshot them
 * without needing WebGL / React Three Fiber in headless Chromium.
 *
 * All props are JSON-serializable strings/numbers (Node.js → browser boundary).
 */
import { useEffect, useRef } from 'react';
import { generateChibiFromSeed } from './chibi-generator';
import { type ChibiFaceInput, createChibiFaceTexture } from './face-texture';

// ---------------------------------------------------------------------------
// FaceTexturePreview — renders a single chibi face as a 2D <img>
// ---------------------------------------------------------------------------

export function FaceTexturePreview({
  skinTone,
  eyeColor,
  hairColor,
  hairStyle,
  facialHair,
  expression,
  race,
}: ChibiFaceInput) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const tex = createChibiFaceTexture({
      skinTone,
      eyeColor,
      hairColor,
      hairStyle,
      facialHair,
      expression,
      race,
    });
    // THREE.CanvasTexture.image is the underlying HTMLCanvasElement
    const canvas = tex.image as HTMLCanvasElement;
    if (imgRef.current) {
      imgRef.current.src = canvas.toDataURL('image/png');
    }
    tex.dispose();
  }, [skinTone, eyeColor, hairColor, hairStyle, facialHair, expression, race]);

  return (
    <div
      data-testid="face-preview"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 12,
        background: '#f5f0e8',
      }}
    >
      <img
        ref={imgRef}
        data-testid="face-image"
        alt={`${expression} face`}
        width={256}
        height={256}
        style={{ imageRendering: 'pixelated', border: '2px solid #d4c9b0' }}
      />
      <span
        style={{
          marginTop: 6,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#5c3a1e',
        }}
      >
        {expression} / {hairStyle} / {facialHair}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FaceTextureGrid — renders multiple face textures in a grid
// ---------------------------------------------------------------------------

export function FaceTextureGrid({
  faces,
  columns = 4,
}: {
  faces: ChibiFaceInput[];
  columns?: number;
}) {
  return (
    <div
      data-testid="face-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 8,
        padding: 16,
        background: '#f5f0e8',
      }}
    >
      {faces.map((face) => (
        <FaceTexturePreview
          key={`${face.expression}-${face.hairStyle}-${face.facialHair}-${face.skinTone}`}
          {...face}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorSwatch — tiny inline color chip
// ---------------------------------------------------------------------------

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          background: color,
          border: '1px solid #888',
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#333' }}>
        {label}: {color}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChibiConfigCard — renders a ChibiConfig as a styled property card
// ---------------------------------------------------------------------------

export function ChibiConfigCard({ seed }: { seed: string }) {
  const config = generateChibiFromSeed(seed);

  return (
    <div
      data-testid="chibi-card"
      style={{
        border: '2px solid #d4c9b0',
        borderRadius: 8,
        padding: 12,
        background: '#faf8f3',
        fontFamily: 'monospace',
        fontSize: 12,
        width: 240,
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 14,
          marginBottom: 8,
          color: '#5c3a1e',
          borderBottom: '1px solid #d4c9b0',
          paddingBottom: 4,
        }}
      >
        seed: &quot;{seed}&quot;
      </div>

      <div style={{ marginBottom: 6 }}>
        <strong>Race:</strong> {config.race} &nbsp;|&nbsp; <strong>Job:</strong>{' '}
        {config.job}
      </div>
      <div style={{ marginBottom: 6 }}>
        <strong>Expression:</strong> {config.expression}
      </div>
      <div style={{ marginBottom: 6 }}>
        <strong>Hair:</strong> {config.hairStyle} &nbsp;|&nbsp;{' '}
        <strong>Facial:</strong> {config.facialHair}
      </div>
      <div style={{ marginBottom: 6 }}>
        <strong>Weapon:</strong> {config.weaponType} &nbsp;|&nbsp;{' '}
        <strong>Cloak:</strong> {config.hasCloak ? 'yes' : 'no'}
      </div>
      <div style={{ marginBottom: 4 }}>
        <strong>Head:</strong> {config.headSize.toFixed(2)} &nbsp;|&nbsp;{' '}
        <strong>Body:</strong> {config.bodyPlumpness.toFixed(2)}
      </div>

      <div style={{ marginTop: 8 }}>
        <ColorSwatch color={config.skinTone} label="skin" />
        <ColorSwatch color={config.hairColor} label="hair" />
        <ColorSwatch color={config.eyeColor} label="eyes" />
        <ColorSwatch color={config.primaryColor} label="primary" />
        <ColorSwatch color={config.secondaryColor} label="secondary" />
        <ColorSwatch color={config.accentColor} label="accent" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChibiConfigGrid — renders multiple seeded configs in a grid
// ---------------------------------------------------------------------------

export function ChibiConfigGrid({
  seeds,
  columns = 4,
}: {
  seeds: string[];
  columns?: number;
}) {
  return (
    <div
      data-testid="chibi-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        padding: 16,
        background: '#f5f0e8',
      }}
    >
      {seeds.map((seed) => (
        <ChibiConfigCard key={seed} seed={seed} />
      ))}
    </div>
  );
}
