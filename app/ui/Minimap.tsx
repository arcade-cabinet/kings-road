import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KingdomMap, Settlement } from '@/schemas/kingdom.schema';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore, worldToGrid } from '@/stores/worldStore';

/** Minimap size in CSS pixels */
const MAP_SIZE = 180;
/** Local view shows this many grid tiles in each direction from the player */
const LOCAL_RADIUS = 20;

/** Biome color palette — warm, parchment-like medieval map tones */
const BIOME_COLORS: Record<string, string> = {
  ocean: '#2a5a8c',
  coast: '#c4b78a',
  meadow: '#7db46c',
  farmland: '#a8c47d',
  forest: '#3d7a3d',
  deep_forest: '#2a5c2a',
  hills: '#a89070',
  mountain: '#8a8080',
  moor: '#7a6a6a',
  swamp: '#4a6a4a',
  riverside: '#5a9a7a',
  highland: '#9a8a7a',
};

const ROAD_COLORS: Record<string, string> = {
  highway: '#8b6f47',
  secondary: '#9a8060',
  path: '#a89878',
  trail: '#b0a088',
};

const RIVER_COLORS: Record<string, string> = {
  stream: '#5588bb',
  river: '#4477aa',
  wide: '#3366aa',
};

const RIVER_WIDTHS: Record<string, number> = {
  stream: 0.6,
  river: 1.0,
  wide: 1.6,
};

/** Settlement marker sizes by type */
const SETTLEMENT_SIZES: Record<string, number> = {
  city: 3.5,
  town: 2.8,
  village: 2.0,
  hamlet: 1.5,
  outpost: 1.5,
  monastery: 2.0,
  ruin: 1.5,
  port: 2.5,
};

const SETTLEMENT_COLORS: Record<string, string> = {
  city: '#e8c547',
  town: '#d4a83a',
  village: '#c49a35',
  hamlet: '#b08a30',
  outpost: '#a07828',
  monastery: '#c4a040',
  ruin: '#8a7060',
  port: '#d4b040',
};

/**
 * Pre-render the full kingdom map to an offscreen canvas.
 * Returns the ImageData-backed canvas for blitting into the minimap.
 */
function renderBaseMap(map: KingdomMap): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext('2d')!;

  // Draw biome tiles
  const imageData = ctx.createImageData(map.width, map.height);
  const data = imageData.data;
  for (let i = 0; i < map.tiles.length; i++) {
    const tile = map.tiles[i];
    const hex = BIOME_COLORS[tile.biome] ?? '#444444';
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);

    // Subtle elevation shading — lighter at higher elevations
    const shade = 0.85 + tile.elevation * 0.15;

    const idx = i * 4;
    data[idx] = Math.min(255, Math.round(r * shade));
    data[idx + 1] = Math.min(255, Math.round(g * shade));
    data[idx + 2] = Math.min(255, Math.round(b * shade));
    data[idx + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  // Draw rivers
  for (const river of map.rivers) {
    if (river.path.length < 2) continue;
    ctx.strokeStyle = RIVER_COLORS[river.width] ?? RIVER_COLORS.river;
    ctx.lineWidth = RIVER_WIDTHS[river.width] ?? 1.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(river.path[0][0] + 0.5, river.path[0][1] + 0.5);
    for (let i = 1; i < river.path.length; i++) {
      ctx.lineTo(river.path[i][0] + 0.5, river.path[i][1] + 0.5);
    }
    ctx.stroke();
  }

  // Draw region boundaries (dashed lines)
  for (const region of map.regions) {
    const [minX, minY, maxX, maxY] = region.bounds;
    ctx.strokeStyle = 'rgba(90, 70, 40, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
  }
  ctx.setLineDash([]);

  // Draw roads
  for (const road of map.roads) {
    const points = [road.from, ...road.waypoints, road.to];
    if (points.length < 2) continue;
    ctx.strokeStyle = ROAD_COLORS[road.type] ?? ROAD_COLORS.path;
    ctx.lineWidth =
      road.type === 'highway' ? 1.5 : road.type === 'secondary' ? 1.0 : 0.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0][0] + 0.5, points[0][1] + 0.5);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0] + 0.5, points[i][1] + 0.5);
    }
    ctx.stroke();
  }

  return canvas;
}

/**
 * Render a fog-of-war overlay. Unexplored tiles are dark.
 */
function renderFog(
  ctx: CanvasRenderingContext2D,
  map: KingdomMap,
  explored: Set<string>,
  viewX: number,
  viewY: number,
  viewW: number,
  viewH: number,
  canvasSize: number,
  scale: number,
) {
  // Draw a semi-transparent overlay for unexplored tiles
  const tileW = canvasSize / viewW;
  const tileH = canvasSize / viewH;

  for (let gy = Math.floor(viewY); gy < Math.ceil(viewY + viewH); gy++) {
    for (let gx = Math.floor(viewX); gx < Math.ceil(viewX + viewW); gx++) {
      if (gx < 0 || gx >= map.width || gy < 0 || gy >= map.height) continue;
      const key = `${gx},${gy}`;
      if (explored.has(key)) continue;

      const sx = (gx - viewX) * scale;
      const sy = (gy - viewY) * scale;
      ctx.fillStyle = 'rgba(20, 16, 10, 0.7)';
      ctx.fillRect(sx, sy, tileW + 0.5, tileH + 0.5);
    }
  }
}

/**
 * Draw settlement markers.
 */
function drawSettlements(
  ctx: CanvasRenderingContext2D,
  settlements: Settlement[],
  viewX: number,
  viewY: number,
  scale: number,
  isLocal: boolean,
) {
  for (const s of settlements) {
    const sx = (s.position[0] - viewX) * scale + scale * 0.5;
    const sy = (s.position[1] - viewY) * scale + scale * 0.5;

    // Skip if off-canvas
    if (
      sx < -10 ||
      sx > MAP_SIZE * 2 + 10 ||
      sy < -10 ||
      sy > MAP_SIZE * 2 + 10
    )
      continue;

    const size = (SETTLEMENT_SIZES[s.type] ?? 2) * (isLocal ? 1.5 : 1);
    const color = SETTLEMENT_COLORS[s.type] ?? '#c49a35';

    // Marker dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Label (only if scale is large enough or it's a major settlement)
    const showLabel = isLocal || s.type === 'city' || s.type === 'town';
    if (showLabel) {
      const fontSize = isLocal ? 8 : 6;
      ctx.font = `bold ${fontSize}px serif`;
      ctx.fillStyle = '#3a2a18';
      ctx.textAlign = 'center';
      ctx.fillText(s.name, sx, sy - size - 2);
    }
  }
}

/**
 * Draw compass rose in the top-right corner.
 */
function drawCompass(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size - 14;
  const cy = 14;
  const r = 8;

  // Background circle
  ctx.fillStyle = 'rgba(245, 240, 232, 0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b6f47';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // N pointer (red)
  ctx.fillStyle = '#c44030';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx - 2.5, cy);
  ctx.lineTo(cx + 2.5, cy);
  ctx.closePath();
  ctx.fill();

  // S pointer
  ctx.fillStyle = '#5a4a3a';
  ctx.beginPath();
  ctx.moveTo(cx, cy + r);
  ctx.lineTo(cx - 2.5, cy);
  ctx.lineTo(cx + 2.5, cy);
  ctx.closePath();
  ctx.fill();

  // N label
  ctx.font = 'bold 6px serif';
  ctx.fillStyle = '#c44030';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - r - 2);
}

/**
 * Canvas-based 2D minimap showing the kingdom geography.
 * Reads the generated kingdom map from worldStore, renders biomes, roads,
 * rivers, settlements, and the player's position.
 *
 * Supports two zoom levels (kingdom / local) toggled by clicking.
 */
export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exploredRef = useRef<Set<string>>(new Set());
  const [isLocal, setIsLocal] = useState(false);

  const kingdomMap = useWorldStore((s) => s.kingdomMap);

  // Pre-render the base map once when the kingdom map changes
  const baseMapCanvas = useMemo(() => {
    if (!kingdomMap) return null;
    return renderBaseMap(kingdomMap);
  }, [kingdomMap]);

  // Track explored tiles around the player — runs periodically via draw() interval
  const revealExplored = useCallback(() => {
    if (!kingdomMap) return;
    const pp = useGameStore.getState().playerPosition;
    const [gx, gy] = worldToGrid(pp.x, pp.z);
    // Reveal tiles within a small radius around the player
    const revealRadius = 3;
    for (let dy = -revealRadius; dy <= revealRadius; dy++) {
      for (let dx = -revealRadius; dx <= revealRadius; dx++) {
        const tx = gx + dx;
        const ty = gy + dy;
        if (
          tx >= 0 &&
          tx < kingdomMap.width &&
          ty >= 0 &&
          ty < kingdomMap.height
        ) {
          exploredRef.current.add(`${tx},${ty}`);
        }
      }
    }
  }, [kingdomMap]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !kingdomMap || !baseMapCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reveal explored tiles before drawing
    revealExplored();

    const playerPosition = useGameStore.getState().playerPosition;
    const cameraYaw = useGameStore.getState().cameraYaw;

    const dpr = window.devicePixelRatio || 1;
    const size = MAP_SIZE * dpr;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
      ctx.scale(dpr, dpr);
    }

    const [playerGx, playerGy] = worldToGrid(
      playerPosition.x,
      playerPosition.z,
    );

    // Clear with parchment background
    ctx.fillStyle = '#2a2218';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Calculate view bounds
    let viewX: number;
    let viewY: number;
    let viewW: number;
    let viewH: number;

    if (isLocal) {
      // Local view: centered on player
      viewW = LOCAL_RADIUS * 2;
      viewH = LOCAL_RADIUS * 2;
      viewX = playerGx - LOCAL_RADIUS;
      viewY = playerGy - LOCAL_RADIUS;
    } else {
      // Kingdom view: show the whole map
      viewX = 0;
      viewY = 0;
      viewW = kingdomMap.width;
      viewH = kingdomMap.height;
    }

    const scale = MAP_SIZE / Math.max(viewW, viewH);

    // Center the map if aspect ratio doesn't match
    const drawW = viewW * scale;
    const drawH = viewH * scale;
    const offsetX = (MAP_SIZE - drawW) / 2;
    const offsetY = (MAP_SIZE - drawH) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Blit the base map into our view
    ctx.imageSmoothingEnabled = !isLocal;
    ctx.drawImage(
      baseMapCanvas,
      viewX,
      viewY,
      viewW,
      viewH, // source rect (grid coords = pixels on base canvas)
      0,
      0,
      drawW,
      drawH, // dest rect
    );

    // Fog of war
    renderFog(
      ctx,
      kingdomMap,
      exploredRef.current,
      viewX,
      viewY,
      viewW,
      viewH,
      MAP_SIZE,
      scale,
    );

    // Settlement markers
    drawSettlements(ctx, kingdomMap.settlements, viewX, viewY, scale, isLocal);

    // Region name labels (kingdom view only)
    if (!isLocal) {
      for (const region of kingdomMap.regions) {
        const [minX, minY, maxX, maxY] = region.bounds;
        const cx = ((minX + maxX) / 2 - viewX) * scale;
        const cy = ((minY + maxY) / 2 - viewY) * scale;
        if (cx < 0 || cx > drawW || cy < 0 || cy > drawH) continue;
        ctx.font = 'italic 5px serif';
        ctx.fillStyle = 'rgba(60, 45, 25, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText(region.name, cx, cy);
      }
    }

    // Player position
    const playerSx = (playerGx - viewX) * scale + scale * 0.5;
    const playerSy = (playerGy - viewY) * scale + scale * 0.5;

    // Facing direction line
    const dirLen = isLocal ? 10 : 6;
    const dirX = playerSx + Math.sin(-cameraYaw) * dirLen;
    const dirY = playerSy - Math.cos(-cameraYaw) * dirLen;
    ctx.strokeStyle = '#ff6060';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playerSx, playerSy);
    ctx.lineTo(dirX, dirY);
    ctx.stroke();

    // Player dot
    const playerDotSize = isLocal ? 4 : 3;
    ctx.fillStyle = '#e84040';
    ctx.beginPath();
    ctx.arc(playerSx, playerSy, playerDotSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Compass rose
    drawCompass(ctx, drawW);

    ctx.restore();

    // Border — warm parchment frame
    ctx.strokeStyle = '#8b6f47';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Inner border for depth
    ctx.strokeStyle = '#6b5530';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(2, 2, MAP_SIZE - 4, MAP_SIZE - 4);

    // Zoom indicator text
    ctx.font = 'bold 7px serif';
    ctx.fillStyle = 'rgba(139, 111, 71, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(isLocal ? 'Local' : 'Kingdom', 5, MAP_SIZE - 5);
  }, [revealExplored, kingdomMap, baseMapCanvas, isLocal]);

  // Redraw at ~10fps
  useEffect(() => {
    const id = setInterval(draw, 100);
    draw();
    return () => clearInterval(id);
  }, [draw]);

  const handleClick = useCallback(() => {
    setIsLocal((prev) => !prev);
  }, []);

  // Don't render if no kingdom map
  if (!kingdomMap) return null;

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: MAP_SIZE,
        height: MAP_SIZE,
        imageRendering: isLocal ? 'pixelated' : 'auto',
        cursor: 'pointer',
      }}
      className="rounded border border-yellow-700/40"
      title="Click to toggle zoom"
    />
  );
}
