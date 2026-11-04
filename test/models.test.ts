import { describe, expect, it } from 'vitest';
import { credits } from '../src/index.js';
import type { Visit } from '../src/index.js';

const v = (channel: string, paid = 0): Visit => ({ channel, paid });
// The simulated buyer: Direct ad → SEO → Telegram → VK retargeting → typed the address.
const path = [v('yandex_direct', 1), v('organic'), v('social'), v('vk_ads', 1), v('direct')];
const shares = (model: Parameters<typeof credits>[1], custom?: [number, number, number]) =>
  Object.fromEntries(credits(path, model, custom).map((c) => [c.visit.channel, Math.round(c.share * 1000) / 10]));

describe('attribution models', () => {
  it('single-touch models give everything to one visit', () => {
    expect(shares('first')).toEqual({ yandex_direct: 100 });
    expect(shares('last')).toEqual({ direct: 100 });
    expect(shares('last_paid')).toEqual({ vk_ads: 100 });
  });

  it('multi-touch models split the conversion and always sum to 100%', () => {
    expect(shares('linear')).toEqual({ yandex_direct: 20, organic: 20, social: 20, vk_ads: 20, direct: 20 });
    expect(shares('u_shape')).toEqual({ yandex_direct: 40, organic: 6.7, social: 6.7, vk_ads: 6.7, direct: 40 });
    expect(shares('time_decay')).toEqual({ yandex_direct: 6.7, organic: 13.3, social: 20, vk_ads: 26.7, direct: 33.3 });
    expect(shares('reverse_decay')).toEqual({ yandex_direct: 33.3, organic: 26.7, social: 20, vk_ads: 13.3, direct: 6.7 });
    expect(shares('custom', [60, 10, 30])).toEqual({ yandex_direct: 60, organic: 3.3, social: 3.3, vk_ads: 3.3, direct: 30 });
    for (const m of ['linear', 'u_shape', 'time_decay', 'reverse_decay', 'custom'] as const) {
      expect(credits(path, m).reduce((s, c) => s + c.share, 0)).toBeCloseTo(1, 10);
    }
  });

  it('handles one and two visits', () => {
    expect(credits([v('organic')], 'u_shape')).toEqual([{ visit: v('organic'), share: 1 }]);
    expect(credits([v('organic'), v('direct')], 'u_shape').map((c) => c.share)).toEqual([0.5, 0.5]);
  });
});
