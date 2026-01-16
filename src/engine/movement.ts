export interface Moveable {
  x: number;
  y: number;
  z: number;
}

/**
 * Moves an entity towards a target position by a given speed and time delta.
 * Modifies the entity's position in place.
 *
 * @param entity The entity to move (must have x, y, z).
 * @param tx Target x coordinate.
 * @param ty Target y coordinate.
 * @param tz Target z coordinate.
 * @param speed Movement speed in units per second.
 * @param dt Time delta in seconds.
 * @returns The remaining distance to the target *before* the move.
 */
export const moveTowards = (
  entity: Moveable,
  tx: number,
  ty: number,
  tz: number,
  speed: number,
  dt: number,
): number => {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dz = tz - entity.z;
  const dist = Math.hypot(dx, dy, dz);

  if (dist > 0) {
    const step = Math.min(dist, speed * dt);
    const inv = step / dist;
    entity.x += dx * inv;
    entity.y += dy * inv;
    entity.z += dz * inv;
  }
  return dist;
};
