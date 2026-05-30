// FPS source: where the host agent gets the "frames delivered this second".
//
// v0 (demo default): SIMULATED — produces a realistic, slightly noisy FPS around a
// target, so the whole payment flow can be validated without a real stream.
//
// v1 (real): read Sunshine's stats. Sunshine logs the encoded FPS; a real
// implementation would tail its log / query its stats endpoint and return the
// measured value. The rest of the agent doesn't change — only this function.

let _t = 0;

/**
 * Returns the FPS delivered in the last second.
 * @returns {number} integer FPS
 */
export function sampleFps() {
  if ((process.env.FPS_MODE || "sim") === "sim") {
    // Target ~60 fps with small ±noise and an occasional dip, to look real.
    _t += 1;
    const base = 60;
    const noise = Math.round(Math.sin(_t / 3) * 4); // gentle wobble
    const dip = _t % 17 === 0 ? -25 : 0; // occasional stutter
    return Math.max(1, base + noise + dip);
  }

  // FPS_MODE=real → plug Sunshine stats here.
  // Example shape (left as a clear TODO so v1 only touches this file):
  //   const stats = await readSunshineStats();
  //   return Math.round(stats.encodedFps);
  throw new Error("FPS_MODE=real not wired yet — read Sunshine stats here (WB4-v1).");
}
