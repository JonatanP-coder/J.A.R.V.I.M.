/**
 * Pure directional kinematics and camera-synchronization math for the Mars Rover.
 * Keeps camera orbit, rover heading rotation, and WASD strafe vectors strictly aligned.
 */

export interface CameraBasisXZ {
  fwdX: number;
  fwdZ: number;
  rightX: number;
  rightZ: number;
  camGazeAngle: number;
}

/**
 * Given the camera's spherical azimuth angle `sphericalTheta` (around Y axis,
 * where camera offset is [R*sin(phi)*sin(theta), R*cos(phi), R*sin(phi)*cos(theta)]),
 * computes the normalized horizontal Forward vector (from camera toward rover)
 * and Right vector (Forward × Up) in Three.js right-handed coordinates.
 */
export function getCameraBasisXZ(sphericalTheta: number): CameraBasisXZ {
  const rawFwdX = -Math.sin(sphericalTheta);
  const rawFwdZ = -Math.cos(sphericalTheta);
  const len = Math.hypot(rawFwdX, rawFwdZ) || 1;
  const fwdX = rawFwdX / len;
  const fwdZ = rawFwdZ / len;

  // Forward × Up (0, 1, 0) = (-fwdZ, 0, fwdX)
  const rightX = -fwdZ;
  const rightZ = fwdX;

  // Yaw angle so local +Z points along (fwdX, fwdZ): (sin(a), cos(a)) = (fwdX, fwdZ)
  const camGazeAngle = Math.atan2(fwdX, fwdZ);

  return { fwdX, fwdZ, rightX, rightZ, camGazeAngle };
}

/**
 * Computes normalized directional world-space target velocity for WASD strafe movement.
 * - W (+1 fwd): moves along camera Forward
 * - S (-1 fwd): moves along camera Backward
 * - D (+1 strafe): moves strictly toward camera Right
 * - A (-1 strafe): moves strictly toward camera Left
 */
export function computeStrafeTargetVelocity(
  moveFwd: number,
  moveStrafe: number,
  basis: CameraBasisXZ,
  maxSpeed: number
): { vx: number; vz: number } {
  if (moveFwd === 0 && moveStrafe === 0) {
    return { vx: 0, vz: 0 };
  }

  let dirX = basis.fwdX * moveFwd + basis.rightX * moveStrafe;
  let dirZ = basis.fwdZ * moveFwd + basis.rightZ * moveStrafe;
  const dirLen = Math.hypot(dirX, dirZ) || 1;
  dirX /= dirLen;
  dirZ /= dirLen;

  return {
    vx: dirX * maxSpeed,
    vz: dirZ * maxSpeed,
  };
}

/**
 * Smoothly interpolates `currentAngle` toward `targetAngle` along the shortest arc
 * without flipping 360° across the ±π discontinuity.
 */
export function dampAngleShortest(
  currentAngle: number,
  targetAngle: number,
  lambda: number,
  dt: number
): number {
  const diff = Math.atan2(
    Math.sin(targetAngle - currentAngle),
    Math.cos(targetAngle - currentAngle)
  );
  const t = 1 - Math.exp(-lambda * dt);
  return currentAngle + diff * t;
}

/**
 * Maps rover heading angle `roverHeading` (measured clockwise/CCW consistent with atan2(x, z))
 * to Three.js `rover.rotation.y` so local +Z points along (sin(roverHeading), cos(roverHeading))
 * and rotates in the exact same left/right direction as the camera.
 */
export function getRoverModelYaw(roverHeading: number): number {
  return roverHeading;
}

/**
 * Computes wheel steering angle (`rotation.y`) and rolling direction (`rollSign`)
 * for visual alignment of the 6 rover wheels during strafe and reverse travel.
 */
export function getWheelSteerAndRoll(
  moveFwd: number,
  moveStrafe: number
): { steerAngleRad: number; rollSign: number } {
  if (moveFwd === 0 && moveStrafe === 0) {
    return { steerAngleRad: 0, rollSign: 1 };
  }

  if (moveFwd >= 0) {
    // Local +X is left, local -X is right -> right strafe requires negative Y rotation
    const angle = Math.atan2(-moveStrafe, moveFwd);
    return {
      steerAngleRad: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, angle)),
      rollSign: 1,
    };
  }

  // Reversing: steer wheels opposite and roll backward
  const angle = Math.atan2(moveStrafe, -moveFwd);
  return {
    steerAngleRad: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, angle)),
    rollSign: -1,
  };
}
