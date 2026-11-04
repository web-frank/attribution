/** Input order is chronological, oldest first. Additional fields are preserved by reference. */
export interface Visit { channel: string; paid?: boolean | number }
export const MODELS = ['first', 'last', 'last_paid', 'linear', 'u_shape', 'time_decay', 'reverse_decay', 'custom'] as const;
export type Model = typeof MODELS[number];
export type CustomWeights = readonly [first: number, middle: number, last: number];
export interface Credit<T extends Visit = Visit> { visit: T; share: number }
export function isModel(value: unknown): value is Model {
  return (MODELS as readonly unknown[]).includes(value);
}

/** Last paid click, then last non-direct visit, then last visit. */
function pickTouch<T extends Visit>(visits: readonly T[], model: 'first' | 'last' | 'last_paid'): T {
  if (model === 'first') return visits[0];
  if (model === 'last_paid') {
    for (let i = visits.length - 1; i >= 0; i--) if (visits[i].paid) return visits[i];
    for (let i = visits.length - 1; i >= 0; i--) if (visits[i].channel !== 'direct') return visits[i];
  }
  return visits[visits.length - 1];
}

function positionWeights(n: number, first: number, middle: number, last: number): number[] {
  if (n === 1) return [1];
  if (n === 2) return [first, last];
  return Array.from({ length: n }, (_, i) => i === 0 ? first : i === n - 1 ? last : middle / (n - 2));
}

/** Shares sum to one; single-touch models return only the winning entry. */
export function credits<T extends Visit>(visits: readonly T[], model: Model, custom: CustomWeights = [40, 20, 40]): Credit<T>[] {
  if (!isModel(model)) throw new TypeError('Unknown attribution model');
  const n = visits.length;
  if (!n) return [];
  let weights: number[];
  switch (model) {
    case 'first':
    case 'last':
    case 'last_paid':
      return [{ visit: pickTouch(visits, model), share: 1 }];
    case 'linear': weights = visits.map(() => 1); break;
    case 'u_shape': weights = positionWeights(n, 40, 20, 40); break;
    case 'time_decay': weights = visits.map((_, i) => i + 1); break;
    case 'reverse_decay': weights = visits.map((_, i) => n - i); break;
    case 'custom':
      if (custom.length !== 3 || custom.some(w => !Number.isFinite(w) || w < 0) || !custom.some(w => w > 0)) {
        throw new RangeError('Expected three finite nonnegative weights, at least one positive');
      }
      weights = positionWeights(n, ...custom);
      break;
  }
  // Scale before summing to avoid overflow for large but finite custom weights.
  const scale = weights.reduce((max, weight) => Math.max(max, weight), 0);
  if (!scale) throw new RangeError('Weights for the available visits must have a positive total');
  weights = weights.map(w => w / scale);
  const sum = weights.reduce((s, w) => s + w, 0);
  return visits.map((visit, i) => ({ visit, share: weights[i] / sum }));
}

/** Choose the largest share, preferring the latest visit on a tie. Empty input returns null. */
export function attribute<T extends Visit>(visits: readonly T[], model: Model, custom?: CustomWeights): T | null {
  let best: Credit<T> | undefined;
  for (const credit of credits(visits, model, custom)) {
    if (!best || credit.share >= best.share) best = credit;
  }
  return best?.visit ?? null;
}
