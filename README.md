# Blackjack Lab

A minimal blackjack basic strategy trainer. Two tabs: Practice and Hints. No statistics, scores, streaks, or session dashboards.

## Run locally

Requires Node.js 20 or later. No dependency installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Run `npm test` to verify the strategy engine and `npm run build` to generate the deployable `dist/` folder.

## Features

- A focused practice table with animated cards, immediate feedback, and explanations.
- Settings for 4/6/8 decks, H17/S17, double after split, and late surrender.
- Interactive, printable hints charts that update with the selected rules.
- Hard, soft, pair, or mixed practice; optional audio and auto-advance.
- Keyboard shortcuts, mobile layouts, and reduced-motion support.
- Only rules and preferences are saved. The app does not collect new hand history or calculate statistics. Previous v1 preferences are recognized; old statistics are not migrated or displayed.

## Strategy scope

The pure engine in `src/strategy.js` implements initial two-card, total-dependent strategy for 4–8 deck **American peek** blackjack, with doubling on any initial two cards. The same chart applies to all supported deck counts. The reference is [Wizard of Odds](https://wizardofodds.com/games/blackjack/strategy/4-decks/), including H17 surrender and doubling exceptions.

Scenarios are balanced for practice rather than drawn from a continuing shoe. This is a first-decision quiz; cards are not played out. Single/double deck, composition exceptions, European no-hole-card rules, re-splitting, counting deviations, and side bets are outside the current chart.

## Extending and hosting

The application is static and can run on a CDN without a backend. `src/strategy.js` is independent of the UI, and `src/storage.js` isolates preference persistence. New rule families should use independently verified strategy providers. Authentication or cross-device settings can be added through a storage adapter.

`.openai/hosting.json` retains the existing private Sites identity. Only `dist/` is published; source is managed separately from the deployment artifact.
