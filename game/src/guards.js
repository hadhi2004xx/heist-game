// The four guards: patrol / suspicious / investigate / chase / return.
// A guard's state is driven by what it sees (vision.js) and what it hears
// (footsteps while the thief runs, a tossed coin, the power box being cut).
// Every transition is explicit, so a caught moment is always fair: the guard
// must see the thief, turn suspicious, and only then give chase.

import { GUARD } from './config.js';
import { COVER_RECTS, buildWallRects } from './level.js';
import { pointInCone } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';
export const GUARD_RETURN = 'return';

function moveToward(guard, tx, ty, speed, dt, rects) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return true;
  const step = Math.min(distance, speed * dt);
  const nx = guard.x + (dx / distance) * step;
  const ny = guard.y + (dy / distance) * step;
  // Same circle-vs-rect slide as the thief, so a guard never clips a desk.
  let px = nx;
  let py = ny;
  for (const r of rects) {
    const nearestX = Math.max(r.x, Math.min(px, r.x + r.w));
    const nearestY = Math.max(r.y, Math.min(py, r.y + r.h));
    const ox = px - nearestX;
    const oy = py - nearestY;
    const d2 = ox * ox + oy * oy;
    if (d2 < GUARD.radius * GUARD.radius) {
      if (d2 === 0) py = r.y - GUARD.radius;
      else {
        const d = Math.sqrt(d2);
        px = nearestX + (ox / d) * GUARD.radius;
        py = nearestY + (oy / d) * GUARD.radius;
      }
    }
  }
  guard.x = px;
  guard.y = py;
  guard.facing = Math.atan2(dy, dx);
  return distance - step < 2;
}

export function createGuards(defs) {
  return defs.map((def) => ({
    name: def.name,
    waypoints: def.waypoints,
    mode: def.mode,
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    waypoint: 1 % def.waypoints.length,
    direction: 1,
    facing: 0,
    state: GUARD_PATROL,
    pause: 0,
    /** Seconds of unbroken sight accumulated while suspicious. */
    suspicion: 0,
    lastSeen: null,
    investigateTarget: null,
    /** Seconds since this guard last saw the thief. */
    unseenFor: 99,
  }));
}

function nextWaypoint(guard) {
  if (guard.mode === 'pingpong') {
    let next = guard.waypoint + guard.direction;
    if (next >= guard.waypoints.length || next < 0) {
      guard.direction *= -1;
      next = guard.waypoint + guard.direction;
    }
    guard.waypoint = next;
  } else {
    guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
  }
}

/**
 * One fixed step for every guard. `sight` is the shared vision result for
 * this step ({ seen, factor, observer }); `noise` is the list of sounds the
 * guards can hear ({ x, y, radius }). Returns an event flag for the audio.
 */
export function stepGuards(guards, dt, context) {
  const { player, segments, alarm, vaultDoorShut, noiseEvents, smokeActive } = context;
  const rects = [...buildWallRects(vaultDoorShut), ...COVER_RECTS];
  let heardNoise = false;

  for (const guard of guards) {
    const sees =
      !smokeActive &&
      pointInCone(
        guard.x, guard.y, guard.facing, GUARD.coneHalfAngle, GUARD.coneRange,
        player.x, player.y, segments,
      );
    const factor = sees ? context.sightFactor(player) : 0;
    guard.sees = factor > 0;
    if (factor > 0) {
      guard.unseenFor = 0;
      guard.lastSeen = { x: player.x, y: player.y };
      guard.suspicion += dt;
      if (guard.state === GUARD_PATROL || guard.state === GUARD_RETURN) {
        guard.state = GUARD_SUSPICIOUS;
      }
    } else {
      guard.unseenFor += dt;
      guard.suspicion = Math.max(0, guard.suspicion - dt * 2);
      if (guard.state === GUARD_SUSPICIOUS && guard.suspicion === 0) guard.state = GUARD_PATROL;
    }

    // Hearing: a noise inside its radius pulls a patrolling guard to look.
    if (guard.state === GUARD_PATROL || guard.state === GUARD_RETURN) {
      for (const noise of noiseEvents) {
        if (Math.hypot(noise.x - guard.x, noise.y - guard.y) <= noise.radius) {
          guard.investigateTarget = { x: noise.x, y: noise.y };
          guard.state = GUARD_INVESTIGATE;
          heardNoise = true;
          break;
        }
      }
    }

    // Alarm thresholds order the guards around even without a sighting.
    if (alarm >= 60 && guard.state !== GUARD_CHASE && guard.lastSeen) {
      guard.state = GUARD_CHASE;
    } else if (alarm >= 25 && guard.state === GUARD_PATROL && guard.lastSeen) {
      guard.investigateTarget = { ...guard.lastSeen };
      guard.state = GUARD_INVESTIGATE;
    }

    switch (guard.state) {
      case GUARD_PATROL: {
        if (guard.pause > 0) {
          guard.pause -= dt;
          break;
        }
        const target = guard.waypoints[guard.waypoint];
        if (moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt, rects)) {
          nextWaypoint(guard);
          guard.pause = GUARD.waypointPause;
        }
        break;
      }
      case GUARD_SUSPICIOUS: {
        // Stare at the spot: the "?" moment before the guard commits.
        guard.facing = Math.atan2(player.y - guard.y, player.x - guard.x);
        if (guard.suspicion >= GUARD.suspectDelay) {
          guard.investigateTarget = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
          guard.state = GUARD_INVESTIGATE;
        }
        break;
      }
      case GUARD_INVESTIGATE: {
        const target = guard.investigateTarget ?? guard.lastSeen;
        if (!target) {
          guard.state = GUARD_RETURN;
          break;
        }
        if (moveToward(guard, target.x, target.y, GUARD.investigateSpeed, dt, rects)) {
          // Looked, found nothing: walk back to the patrol.
          guard.state = GUARD_RETURN;
        }
        break;
      }
      case GUARD_CHASE: {
        if (alarm < 25 && guard.unseenFor > 4) {
          guard.state = GUARD_RETURN;
          break;
        }
        moveToward(guard, player.x, player.y, GUARD.chaseSpeed, dt, rects);
        break;
      }
      case GUARD_RETURN: {
        const home = guard.waypoints[guard.waypoint];
        if (moveToward(guard, home.x, home.y, GUARD.patrolSpeed, dt, rects)) {
          guard.state = GUARD_PATROL;
          guard.pause = GUARD.waypointPause;
        }
        break;
      }
      default:
        guard.state = GUARD_PATROL;
    }
  }
  return heardNoise;
}
