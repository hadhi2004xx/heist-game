// The three sweeping cameras: a visible sweep arc with a blind-spot rhythm,
// a fast alarm rise while the thief is in the arc, and two ways to kill them —
// an EMP pulse (10 seconds) or cutting the power box (forever, at a price).

import { CAMERA } from './config.js';
import { pointInCone } from './vision.js';

export function createCameras(defs, elapsed) {
  return defs.map((def) => ({
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    label: def.label,
    /** Current sweep angle; driven by the game clock, never wall-clock. */
    angle: def.baseAngle,
    /** Seconds left of EMP darkness, 0 when the camera is live. */
    empLeft: 0,
    /** True once the power box has been cut. */
    dead: false,
    phase: elapsed,
  }));
}

/** One fixed step: advance the sweep unless the camera is dark or dead. */
export function stepCameras(cameras, dt, elapsed) {
  for (const camera of cameras) {
    if (camera.empLeft > 0) camera.empLeft = Math.max(0, camera.empLeft - dt);
    if (camera.dead || camera.empLeft > 0) continue;
    camera.angle = camera.baseAngle + Math.sin((elapsed + camera.phase) * camera.speed) * camera.sweep;
  }
}

/** True when this camera is live and has the thief in its arc. */
export function cameraSees(camera, player, segments) {
  if (camera.dead || camera.empLeft > 0) return false;
  return pointInCone(
    camera.x, camera.y, camera.angle, CAMERA.coneHalfAngle, CAMERA.range,
    player.x, player.y, segments,
  );
}

/** The EMP pulse: every live camera goes dark for CAMERA.empSeconds. */
export function empPulse(cameras) {
  for (const camera of cameras) {
    if (!camera.dead) camera.empLeft = CAMERA.empSeconds;
  }
}

/** Cutting the power box kills every camera for the rest of the heist. */
export function cutPower(cameras) {
  for (const camera of cameras) camera.dead = true;
}
