import { GUIDE_PATH } from "./config";

export interface GuidePoint { x: number; y: number; t: number }

export function pointOnGuide(t: number): GuidePoint {
  const u = 1 - t;
  const { start, control1, control2, end } = GUIDE_PATH;
  return {
    x: u ** 3 * start.x + 3 * u ** 2 * t * control1.x + 3 * u * t ** 2 * control2.x + t ** 3 * end.x,
    y: u ** 3 * start.y + 3 * u ** 2 * t * control1.y + 3 * u * t ** 2 * control2.y + t ** 3 * end.y,
    t,
  };
}

export function closestPointOnGuidePath(x: number, y: number): GuidePoint & { distance: number } {
  let best = pointOnGuide(0);
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  for (let index = 0; index <= 80; index += 1) {
    const point = pointOnGuide(index / 80);
    const dx = point.x - x;
    const dy = point.y - y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < bestDistanceSquared) {
      best = point;
      bestDistanceSquared = distanceSquared;
    }
  }
  return { ...best, distance: Math.sqrt(bestDistanceSquared) };
}
