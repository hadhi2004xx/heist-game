// Vision: raycasts against the wall segments, wall-clipped vision cones, and
// the one sight test every guard and camera shares. A cone is drawn exactly
// as it is tested — what the player sees is what the guard sees.

/** Distance from (ox,oy) along direction (dx,dy) to the nearest wall segment, or Infinity. */
export function castRay(ox, oy, dx, dy, segments, maxDistance) {
  let nearest = maxDistance;
  for (let i = 0; i < segments.length; i += 1) {
    const s = segments[i];
    const ex = s.x2 - s.x1;
    const ey = s.y2 - s.y1;
    const denom = dx * ey - dy * ex;
    if (denom === 0) continue;
    const t = ((s.x1 - ox) * ey - (s.y1 - oy) * ex) / denom;
    const u = ((s.x1 - ox) * dy - (s.y1 - oy) * dx) / denom;
    if (t > 0 && t < nearest && u >= 0 && u <= 1) nearest = t;
  }
  return nearest;
}

/** True when the segment from (x1,y1) to (x2,y2) touches no wall. */
export function lineOfSight(x1, y1, x2, y2, segments) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return true;
  return castRay(x1, y1, dx / distance, dy / distance, segments, distance) >= distance;
}

const CONE_RAYS = 26;

/**
 * The wall-clipped vision cone as a polygon: the observer plus one point per
 * ray, each ray stopped by the first wall it meets. `angle` is the cone's
 * centre direction, `halfAngle` its half-width, `range` its reach.
 */
export function conePolygon(x, y, angle, halfAngle, range, segments) {
  const points = [{ x, y }];
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / CONE_RAYS;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const d = castRay(x, y, dx, dy, segments, range);
    points.push({ x: x + dx * d, y: y + dy * d });
  }
  return points;
}

/**
 * Is the target point inside the cone and visible? Checks range, angle and a
 * clear line of sight, in that order — the cheapest test that can fail first.
 */
export function pointInCone(ox, oy, angle, halfAngle, range, tx, ty, segments) {
  const dx = tx - ox;
  const dy = ty - oy;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return false;
  let delta = Math.atan2(dy, dx) - angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  if (Math.abs(delta) > halfAngle) return false;
  return lineOfSight(ox, oy, tx, ty, segments);
}
