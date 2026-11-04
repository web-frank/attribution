import { describe, expect, it } from 'vitest';
import { attribute, credits, isModel, MODELS, type CustomWeights, type Model } from '../src/index.js';
const path = [
  { id: 'first', channel: 'paid_search', paid: true },
  { id: 'middle', channel: 'organic', paid: false },
  { id: 'last', channel: 'direct', paid: false },
];
describe('standalone API', () => {
  it.each(MODELS)('%s handles empty and single-touch paths', model => {
    expect(credits([], model)).toEqual([]); expect(attribute([], model)).toBeNull();
    expect(credits([path[0]], model)).toEqual([{ visit: path[0], share: 1 }]);
    expect(attribute([path[0]], model)).toBe(path[0]);
  });
  it('last_paid falls back to the latest non-direct visit', () => {
    expect(attribute(path.slice(1), 'last_paid')).toBe(path[1]);
  });
  it('last_paid falls back to the last direct visit', () => {
    const direct = [{ channel: 'direct', id: 1 }, { channel: 'direct', id: 2 }];
    expect(attribute(direct, 'last_paid')).toBe(direct[1]);
  });
  it('last_paid accepts numeric flags and picks the latest paid visit', () => {
    const paid = [{ channel: 'a', paid: 1 }, { channel: 'b', paid: 1 }, { channel: 'direct', paid: 0 }];
    expect(attribute(paid, 'last_paid')).toBe(paid[1]);
  });
  it.each([
    ['first', 0], ['last', 2], ['last_paid', 0], ['linear', 2],
    ['u_shape', 2], ['time_decay', 2], ['reverse_decay', 0], ['custom', 2],
  ] as const)('%s picks the expected winner', (model, index) => {
    expect(attribute(path, model)).toBe(path[index]);
  });
  it('custom can select the middle visit', () => {
    expect(attribute(path, 'custom', [10, 80, 10])).toBe(path[1]);
  });
  it('does not mutate inputs and preserves extra properties and references', () => {
    const frozen = Object.freeze(path.map(v => Object.freeze({ ...v })));
    for (const model of MODELS) {
      const result = credits(frozen, model);
      expect(result.every(c => frozen.includes(c.visit))).toBe(true);
      expect(typeof result[0].visit.id).toBe('string');
    }
  });
  it('normalizes two-visit custom weights using only endpoints', () => {
    expect(credits(path.slice(0, 2), 'custom', [60, 10, 30]).map(c => c.share)).toEqual([2 / 3, 1 / 3]);
  });
  it('supports zero shares', () => {
    expect(credits(path, 'custom', [0, 100, 0]).map(c => c.share)).toEqual([0, 1, 0]);
  });
  it.each([[-1, 20, 40], [NaN, 20, 40], [Infinity, 20, 40], [0, 0, 0], [1, 2]])('rejects invalid custom weights %j', (...weights) => {
    expect(() => credits(path, 'custom', weights as unknown as CustomWeights)).toThrow(RangeError);
  });
  it('rejects custom weights with no credit for available endpoints', () => {
    expect(() => credits(path.slice(0, 2), 'custom', [0, 100, 0])).toThrow(RangeError);
  });
  it('normalizes very large finite weights without overflowing', () => {
    const shares = credits(path, 'custom', [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE]);
    expect(shares.map(c => c.share)).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });
  it('recognizes only supported model names', () => {
    MODELS.forEach(model => expect(isModel(model)).toBe(true));
    for (const value of ['other', null, undefined, {}, 1]) expect(isModel(value)).toBe(false);
    expect(() => credits(path, 'other' as Model)).toThrow(TypeError);
  });
  it('sums to one for paths of different lengths in every model', () => {
    for (const length of [2, 4, 10, 100]) {
      const visits = Array.from({ length }, (_, i) => ({ channel: i % 2 ? 'direct' : 'organic' }));
      for (const model of MODELS) {
        const split = credits(visits, model);
        expect(split.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 12);
        expect(split.every(c => c.share >= 0 && c.share <= 1)).toBe(true);
      }
    }
  });
});
