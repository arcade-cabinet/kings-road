# Design

This document covers the visual design, UX decisions, and aesthetic direction of King's Road.

## Visual Identity

### Theme: Pastoral Romanticized Medieval

King's Road draws inspiration from the English countryside, Arthurian legend, and cottagecore aesthetics. The world feels warm, inviting, and gently aged -- golden sunlight on thatched roofs, stone bridges over quiet brooks, meadows with wildflowers and grazing sheep.

Key qualities:
- **Warm and inviting** -- never oppressive or threatening
- **Weathered charm** -- aged wood, mossy stone, faded signposts
- **Natural materials** -- linen, parchment, hewn timber, packed earth
- **Golden light** -- soft sunbeams, glowing hearths, candlelit windows
- **Gentle atmosphere** -- birdsong, distant church bells, rustling leaves

### Color Palette

```
Background & Surface
├── Warm Cream:     #f5f0e8    (page background, UI panels)
├── Light Parchment: #ede8dc   (secondary surfaces)
├── Soft Ivory:     #faf6ef    (highlights)
└── Sky Blue:       #87CEEB    (3D scene background)

Earth Tones
├── Warm Charcoal:  #3d3a34    (primary text)
├── Aged Wood:      #8b6f47    (display text, titles)
├── Honey Stone:    #b8a87f    (weathered stone, borders)
├── Warm Taupe:     #8b8680    (muted text)
└── Dark Brown:     #6b5344    (emphasis text on cream)

Accent Colors
├── Honey Gold:     #c4a747    (UI highlights, NPC names)
├── Rose Coral:     #d97963    (collectibles, warm highlights)
├── Sage Green:     #7a9b6e    (vegetation, health)
└── Amber:          #d4a746    (buttons, interactive elements)

Scene Lighting
├── Day Ambient:    #fff8e7    (warm white)
├── Day Directional: #ffd700   (golden sunlight)
├── Night Ambient:  #1a1a3e    (soft blue)
├── Night Moon:     #8888cc    (cool moonlight)
└── Day Fog:        #e8d7c3    (warm cream haze)
```

### What We Avoid

- Pure black backgrounds or UI
- Blood red, neon, or harsh saturated colors
- Cold blue-gray stone aesthetics
- Grimdark, horror, or oppressive mood
- High-contrast cyberpunk styling

## Typography

### Lora (Display & Headlines)

Used for main titles, location banners, and important UI text. A warm serif with elegant strokes that feels handset and bookish.

- Weights: 400, 600, 700
- CSS: `font-lora` utility class

```css
/* Main title */
font-family: 'Lora', serif;
font-size: 72px;
font-weight: 700;
letter-spacing: 4px;
color: #8b6f47;
text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);

/* Location banner */
font-family: 'Lora', serif;
font-size: 32px;
font-weight: 700;
letter-spacing: 2px;
text-transform: uppercase;
```

### Crimson Text (Body & Dialogue)

Used for NPC names, dialogue text, and narrative content. A warm, classic serif with gentle curves.

- Weights: 400, 600 (italics available)
- CSS: `font-crimson` utility class

```css
/* NPC name */
font-family: 'Crimson Text', serif;
font-size: 22px;
font-weight: 600;
color: #c4a747;

/* Dialogue */
font-family: 'Crimson Text', serif;
font-size: 18px;
line-height: 1.7;
color: #3d3a34;
font-style: italic;
```

## UI Components

### Main Menu

Centered layout on warm cream background. Title "King's Road" in Lora serif, subtitle "Seek the Holy Grail". Seed phrase shown in a parchment-styled container. Warm amber/gold "Enter Realm" button. Gentle floating particles in warm gold tones.

### HUD

- **Top Left**: Health and stamina bars in warm tones (sage green health, amber stamina)
- **Top Center**: Location banner with fade animation
- **Top Right**: Time display (12-hour format), weather label ("Fair"/"Overcast"/"Fog"/"Rain"/"Storm"), day/night indicator
- **Center**: Crosshair and interaction prompt ("[E] TALK Name")
- **Bottom**: First-time controls tooltip (desktop only, fades after 30s, once per session)

All HUD elements use semi-transparent warm cream backgrounds with soft shadows. Text in warm charcoal. Full keybindings are available in the Pause Menu > Settings > Controls tab.

### Dialogue Box

Illuminated manuscript scroll design:
- **Parchment background** (`#f5f0e8`) with subtle radial gradient texture, golden accent bands top/bottom
- **Scroll corner ornaments** in Aged Wood (`#8b6f47`) with decorative dots
- **NPC portrait** — archetype-based SVG silhouette on tinted background (72x72px), inner decorative frame
- **NPC name** in Lora serif, Honey Gold (`#c4a747`), bold tracking-wide
- **Archetype label** below name in small caps Aged Wood
- **Manuscript divider** — gradient rule with central diamond ornament
- **Dialogue text** in Crimson Text italic, Warm Charcoal (`#3d3a34`), decorative curly quotes
- **Choice buttons** styled as medieval tabs — left bar accent, letter prefix (A., B., C.), gradient background
- **Animation** — 3-phase (entering/open/closing) with scale+translate+opacity transitions
- **Typewriter effect** at 25ms per character with pulsing cursor
- **Keyboard support** — ESC to close, Space/Enter to skip typewriter
- Covers all 21 NPC archetypes from the schema

### Settings Panel

Tabbed panel accessible from Pause Menu > Settings. Three tabs:
- **Audio**: Master volume, Music, SFX, Ambient — warm-toned slider controls with percentage display
- **Display**: Render quality (Low/Med/High), Shadows toggle, View distance (Near/Normal/Far), Fullscreen toggle
- **Controls**: Keybindings table (same manuscript style as previous standalone Controls page)
- "Reset Defaults" button (danger variant) and "Back" button at bottom
- All settings persisted to localStorage (`kings-road:settings`)
- Styled with same parchment background and golden accents as Pause Menu

### Mobile Controls

Left half: touch area for virtual joystick spawn. Right side: circular action buttons (70x70px) for Jump and Talk. All controls use warm semi-transparent backgrounds.

## 3D Visual Design

### World Scale

```
BLOCK_SIZE = 5 units
CHUNK_SIZE = 120 units (24 blocks)
PLAYER_HEIGHT = 1.6 units
```

### Building Style: Medieval Half-Timber

- Honey limestone foundation (warm beige, not dark gray)
- Cream plaster walls
- Exposed timber framing in warm oak brown
- Golden straw thatched roofs
- Glowing windows at night (warm amber emissive)

### Procedural Textures

| Material | Color | Description |
|----------|-------|-------------|
| Stone | Honey beige | Warm limestone, not cold gray |
| Plaster | Warm cream | Sunlit whitewash |
| Wood | Oak brown | Rich, warm timber |
| Grass | Lush green | Meadow grass with variation |
| Road | Packed earth | Warm brown/tan gravel |
| Thatch | Golden straw | Sun-bleached straw roofing |

### Lighting

**Daytime:**
- Directional sun following arc
- Warm white ambient light (`#fff8e7`)
- Golden directional light (`#ffd700`)
- Warm cream fog
- drei Sky component with golden sun position

**Nighttime:**
- Soft blue ambient (`#1a1a3e`)
- Cool moonlight directional (`#8888cc`)
- Player lantern (orange point light with flicker)
- Window emissive glow
- Stars visible
- Deep blue fog

### Post-Processing

1. **SMAA** -- anti-aliasing (performant)
2. **Bloom** -- glow on emissive materials (windows, collectibles)
3. **Vignette** -- gentle (0.3 intensity), not oppressive

## Animation

### Player

- Head bob while walking (sine wave, 0.1 unit amplitude)
- Smooth acceleration/deceleration

### NPCs

- Idle breathing (scale Y oscillation)
- Subtle head movement (rotation)

### Collectibles (Relics)

- Vertical float (sine wave, 0.4 unit amplitude)
- Y-axis rotation (1.5 rad/sec)
- Pulsing glow intensity

### UI Transitions

- Location banner: fade in/out (0.5s)
- Dialogue box: instant appear
- Interaction prompt: pulse animation
- Menu fade out on game start

## Responsive Design

### Desktop (>768px)
- Full HUD visible
- Control hints at bottom
- Mouse drag for camera

### Mobile (<768px)
- Control hints hidden
- Virtual joystick enabled
- Touch buttons visible
- Larger interaction buttons
