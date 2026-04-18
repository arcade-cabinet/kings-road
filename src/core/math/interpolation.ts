export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Inverse lerp — returns t such that lerp(a, b, t) === value. */
export function inverseLerp(a: number, b: number, value: number): number {
  return b === a ? 0 : (value - a) / (b - a);
}
