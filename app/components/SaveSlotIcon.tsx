/**
 * SaveSlotIcon — renders a small inline SVG glyph that indicates where the
 * player was when they last saved in a given slot.
 *
 * Three variants:
 *   overworld → rolling hill with a tree (pastoral, open road)
 *   dungeon   → torch with flame (underground, danger)
 *   town      → cottage with chimney and smoke (settlement, safety)
 *
 * Palette: primary shapes use `currentColor` so the caller can tint via CSS
 * (e.g. Tailwind `text-amber-800`). The honey-gold accent (#c4a747) is the
 * only hardcoded colour; it is specific to the game's warm medieval theme and
 * intentionally fixed regardless of the caller's text colour.
 */

import type { SlotKind } from '@/db/save-slot-kind';

interface SaveSlotIconProps {
  kind: SlotKind;
  /** px size; defaults to 16 */
  size?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Glyph sub-components — each is a 16×16 viewBox SVG
// ---------------------------------------------------------------------------

function OverworldGlyph() {
  // A gentle hill silhouette with a small tree to the left.
  return (
    <>
      {/* Hill — currentColor lets the caller tint the primary shape */}
      <path
        d="M1 13 Q4 6 8 6 Q12 6 15 13 Z"
        fill="currentColor"
        opacity="0.75"
      />
      {/* Tree trunk */}
      <rect x="3.5" y="9" width="1" height="3" fill="currentColor" />
      {/* Tree crown — honey-gold accent, fixed */}
      <ellipse cx="4" cy="8" rx="2" ry="2.5" fill="#c4a747" opacity="0.9" />
    </>
  );
}

function DungeonGlyph() {
  // A torch: short handle, wrapped band, teardrop flame.
  return (
    <>
      {/* Handle — currentColor for tintable primary shape */}
      <rect x="7" y="9" width="2" height="5" rx="0.5" fill="currentColor" />
      {/* Grip band — dark overlay, fixed */}
      <rect x="6.5" y="10" width="3" height="1" rx="0.2" fill="#3d3a34" opacity="0.5" />
      {/* Flame — honey-gold accent, fixed */}
      <path
        d="M8 8.5 C6 6.5 6.5 3 8 2 C9.5 3 10 6.5 8 8.5 Z"
        fill="#c4a747"
      />
      {/* Inner flame highlight — warm cream, fixed */}
      <path
        d="M8 7.5 C7.2 6 7.4 4 8 3.2 C8.6 4 8.8 6 8 7.5 Z"
        fill="#f5f0e8"
        opacity="0.6"
      />
    </>
  );
}

function TownGlyph() {
  // A simple cottage: walls, pitched roof, door, chimney with smoke curl.
  return (
    <>
      {/* Walls — currentColor for tintable primary shape */}
      <rect x="3" y="9" width="10" height="5" fill="currentColor" opacity="0.8" />
      {/* Roof — dark overlay, fixed */}
      <polygon points="2,9 8,4 14,9" fill="#3d3a34" opacity="0.75" />
      {/* Door — dark overlay, fixed */}
      <rect x="6.5" y="11" width="3" height="3" rx="0.5" fill="#3d3a34" opacity="0.5" />
      {/* Chimney — currentColor to match walls */}
      <rect x="10" y="5" width="2" height="4" fill="currentColor" opacity="0.9" />
      {/* Smoke curl — honey-gold accent, fixed */}
      <path
        d="M11 5 C11 3.5 12.5 3.5 12 2 C11.5 0.5 10 1 10 2"
        fill="none"
        stroke="#c4a747"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.7"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function SaveSlotIcon({ kind, size = 16, className }: SaveSlotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="img"
      aria-label={`Save location: ${kind}`}
      className={className}
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      {kind === 'dungeon' && <DungeonGlyph />}
      {kind === 'town' && <TownGlyph />}
      {kind === 'overworld' && <OverworldGlyph />}
    </svg>
  );
}
