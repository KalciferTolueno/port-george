/**
 * mulberry32 — deterministic seeded PRNG.
 * Use the same seed → get the same cloud layout every reload.
 */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function (): number {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
