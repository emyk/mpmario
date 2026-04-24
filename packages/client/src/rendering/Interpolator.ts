export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface Vec2 { x: number; y: number; }

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}
