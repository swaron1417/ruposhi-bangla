# Ruposhi Bangla

A bilingual, real-time village farming and river-supply game built with React, TypeScript, and Vite. Plant crops, manage supplies, watch farmers deliver harvests to the ghat, and let cargo boats sell them at the village haat.

## Run locally

```sh
npm install
npm run dev
```

The simulation can be paused or run at 2× speed. Village progress is saved in browser storage; use the Save drawer to export or restore a JSON backup. MetaMask is optional and the wallet panel checks the connected account and Sepolia network.

## Game loop

1. Select a crop and click an empty riverbank field.
2. Restock seeds, water, compost, and tools as needed.
3. Farmers tend and harvest crops, then carry bundles to a ghat.
4. Cargo boats automatically deliver and sell bundles at the corner haat.
5. Complete chapter goals to unlock the next village milestone and upgrades.

The five chapters introduce paddy, jute, cross-river expansion, a timed monsoon market, and a multi-crop delta hub. Use the Settings drawer to switch between Bangla and English.

## Project structure

- `src/simulation/` — village state, autonomous workers, boat movement, ticks, and chapter milestones
- `src/economy/` — crop recipes, supply costs, construction, upgrades, and sale prices
- `src/render/` — Canvas village renderer and map pointer lookup
- `src/storage/` — local village saves and JSON backup import/export
- `src/wallet.ts` — optional MetaMask and Sepolia account/network integration

## Checks

```sh
npm test
npm run lint
npm run build
```
