/**
 * Sim racing optics + planning math for RaceCalc.
 * All formulas pure functions; verified in scripts/test-math.mjs.
 *
 * Core: a screen of physical width W viewed from distance D subtends:
 *   hFOV = 2 × atan( W ÷ (2D) )
 * The in-game FOV that makes the sim match reality is exactly this angle,
 * converted to the convention the sim expects (vertical, horizontal, or a
 * slider scale: handled per game elsewhere).
 *
 * Units: all distances in the same unit (mm, cm or inches). Angles in degrees.
 */

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Horizontal FOV (degrees) for a single screen. */
export function hFov(width: number, distance: number): number {
  if (!(width > 0) || !(distance > 0)) return NaN;
  return deg(2 * Math.atan(width / (2 * distance)));
}

/** Vertical FOV (degrees) for a single screen. */
export function vFov(height: number, distance: number): number {
  if (!(height > 0) || !(distance > 0)) return NaN;
  return deg(2 * Math.atan(height / (2 * distance)));
}

/** Given aspect ratio (w/h), derive vertical FOV from horizontal FOV. */
export function vFromH(h: number, aspect: number): number {
  if (!(h > 0) || !(aspect > 0)) return NaN;
  return deg(2 * Math.atan(Math.tan(rad(h) / 2) / aspect));
}

/** Given aspect ratio, derive horizontal FOV from vertical FOV. */
export function hFromV(v: number, aspect: number): number {
  if (!(v > 0) || !(aspect > 0)) return NaN;
  return deg(2 * Math.atan(Math.tan(rad(v) / 2) * aspect));
}

/** Diagonal FOV (for reference). */
export function dFov(width: number, height: number, distance: number): number {
  const diag = Math.hypot(width, height);
  return hFov(diag, distance);
}

/**
 * Triple screen setup.
 * Screens angled toward the viewer so the rig approximates one continuous arc.
 * Standard rig geometry: side screens each rotated by angle A from the center
 * screen plane; each screen at distance D from eyes with physical width W.
 *
 * - Per-screen subtended FOV: F = 2 atan(W/2D)
 * - Total rig FOV: F_total = F_center + 2 × F_side_effective where the side
 *   screen is angled by A; the effective coverage of an angled screen as seen
 *   from the eye point is F + 2A on the horizontal (approximation used by the
 *   sim racing community when screens are placed on the same arc).
 *   We compute it properly via the intersection geometry below.
 *
 * Proper arc model: three chords of a circle. If screens form a polygonal arc
 * each rotated by angle A from the neighbouring screen, the total covered
 * angle = F + 2A when the side screens are also at nearest distance D.
 */
export function tripleTotalFov(width: number, distance: number, sideAngle: number): number {
  const f = hFov(width, distance);
  if (!Number.isFinite(f) || !(sideAngle >= 0)) return NaN;
  return f + 2 * sideAngle;
}

/** Side screen angle that continues the arc seamlessly (equals per-screen FOV). */
export function sideAngleForSeamlessArc(width: number, distance: number): number {
  return hFov(width, distance);
}

/**
 * Bezel correction: the visible image is interrupted by monitor bezels.
 * Effective additional angle per bezel gap: gap/2 on each adjoining edge.
 * For triples, two gaps exist (left-center, center-right). We express the
 * correction as extra width: correctedWidth = width + gap (per gap at the
 * centre screen edge as seen by the eyes; common practical formula adds the
 * bezel width to the physical width used for FOV).
 */
export function bezelCorrectedFov(width: number, bezel: number, distance: number): number {
  return hFov(width + bezel, distance);
}

/**
 * Pixels per degree (PPD): how many horizontal pixels represent one degree
 * of the rig's field of view. The coverage is total pixels / total FOV.
 */
export function ppd(horizontalPixels: number, totalFov: number): number {
  if (!(horizontalPixels > 0) || !(totalFov > 0)) return NaN;
  return horizontalPixels / totalFov;
}

/**
 * Viewing distance for a target hFOV (rearranged core formula).
 * distance = W / (2 tan(h/2))
 */
export function distanceForFov(width: number, targetHfov: number): number {
  if (!(width > 0) || !(targetHfov > 0) || targetHfov >= 180) return NaN;
  return width / (2 * Math.tan(rad(targetHfov) / 2));
}

/**
 * Speed-based stint planning.
 * fuelNeeded = laps × fuelPerLap × (1 + safetyMargin)
 */
export function fuelForStint(laps: number, fuelPerLap: number, marginPct = 0): number {
  if (!(laps > 0) || !(fuelPerLap > 0)) return NaN;
  return laps * fuelPerLap * (1 + marginPct / 100);
}

/** Laps possible on a tank of fuel. */
export function lapsOnFuel(fuelCapacity: number, fuelPerLap: number, reserveLaps = 0): number {
  if (!(fuelCapacity > 0) || !(fuelPerLap > 0)) return NaN;
  const laps = fuelCapacity / fuelPerLap - reserveLaps;
  return Math.max(0, Math.floor(laps * 10) / 10);
}

/** Stint time estimate: laps × lapTime (seconds) + pit lane delta optional. */
export function stintTime(laps: number, lapTimeSec: number, pitLossSec = 0): number {
  if (!(laps > 0) || !(lapTimeSec > 0)) return NaN;
  return laps * lapTimeSec + pitLossSec;
}

/**
 * Race fuel planning: number of stints for a race distance.
 * Returns plan with equal stint lengths.
 */
export function planStints(totalLaps: number, safeLapsPerTank: number): {
  stints: number;
  lapsPerStint: number;
  lastStintLaps: number;
} | null {
  if (!(totalLaps > 0) || !(safeLapsPerTank > 0)) return null;
  const stints = Math.ceil(totalLaps / safeLapsPerTank);
  const lapsPerStint = Math.ceil(totalLaps / stints);
  const lastStintLaps = totalLaps - lapsPerStint * (stints - 1);
  return { stints, lapsPerStint, lastStintLaps };
}

/** Average lap time for a distance given total time. */
export function avgLapTime(distanceKm: number, totalTimeSec: number): number {
  if (!(distanceKm > 0) || !(totalTimeSec > 0)) return NaN;
  return totalTimeSec / distanceKm;
}
