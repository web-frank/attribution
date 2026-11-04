# attribution

**English** · [Русский](README.ru.md)

8 marketing attribution models in ~1 KB

**714 bytes min+gzip** (1,372 bytes minified ESM). Zero runtime dependencies. ESM, CommonJS and TypeScript declarations.

```js
import { credits, attribute } from 'attribution';
const split = credits([{ channel: 'search', paid: true }, { channel: 'direct' }], 'u_shape');
const winner = attribute(split.map(c => c.visit), 'last_paid');
```

`credits(visits, model, customWeights?)` returns `{ visit, share }[]`. Shares sum to 1. Single-touch models return only the winning entry; other models return one entry per visit, including zero shares. `attribute(visits, model, customWeights?)` returns the visit with the largest share, choosing the latest on ties, or `null` for an empty path. Empty paths produce no credits. Visits and their extra fields are preserved by reference and never mutated.

| Argument / option | Default | Behavior |
| --- | --- | --- |
| `visits` | Required | Array ordered oldest first; each visit has `channel: string` and optional `paid: boolean \| number`. Extra properties are allowed and retained in TypeScript. |
| `model` | Required | One of the eight names below. |
| `customWeights` | `[40, 20, 40]` | `[first, allMiddleVisits, last]`. Middle weight is divided equally; the final result is normalized. Only used by `custom`. |

| Model | Credit rule |
| --- | --- |
| `first` | 100% to the first visit. |
| `last` | 100% to the last visit. |
| `last_paid` | Last paid visit; otherwise last non-direct visit; otherwise last visit. `direct` is case-sensitive. |
| `linear` | Equal shares. |
| `u_shape` | 40% first, 20% split between middle visits, 40% last. |
| `time_decay` | Position weights 1, 2, ..., n. |
| `reverse_decay` | Position weights n, ..., 2, 1. |
| `custom` | User-supplied position weights. |

With one visit, its share is 1. With two visits, position models normalize only the first and last weights. Invalid model names throw `TypeError`. Custom weights must be three finite, nonnegative numbers, at least one positive, and provide positive credit to the available positions; otherwise they throw `RangeError` for nonempty paths. `MODELS` and `isModel(value)` are also exported.

## What it doesn't do

It does not collect data, sort visits, filter conversion windows, identify visitors, load databases or apply CRM-specific rules. Supply the eligible chronological path yourself. Decay is based on ordinal position, not elapsed time or an exponential half-life. It does not round shares or monetary amounts.

## Development

`npm ci`, `npm test`, `npm run build`. Includes the original roitrail model tests adapted to minimal standalone visits, plus API edge cases. Build prints minified ESM and gzip bytes (Node 22, level 9), without tree shaking. MIT © 2026 Daniel Raskopin.

Part of roitrail → https://github.com/web-frank/roitrail

## Live demo

Open [`demo/index.html`](demo/index.html) directly in your browser. The standalone file includes the library and works offline, without a server or build. `npm run build` refreshes its embedded library from the source.
