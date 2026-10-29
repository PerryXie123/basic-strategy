# Blackjack Lab

A responsive basic strategy decision trainer. No runtime dependencies, paid APIs, accounts, or database required.

## Run locally

Requires Node.js 20 or later.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Run `npm test` to verify the strategy engine and `npm run build` to produce the deployable `dist/` folder.

## Included

- 4, 6, and 8 deck American blackjack; H17/S17, DAS, and late surrender settings.
- Animated cards, immediate feedback, contextual explanations, hints, and interactive strategy charts.
- Hard, soft, pair, and mistake drills. 20/50 hand or unlimited sessions.
- Session summaries, accuracy by category, best streak, average decision time, and CSV export.
- Optional audio and auto-advance, keyboard shortcuts, reduced-motion support, and mobile layouts.
- Rules, preferences, and the latest 1,000 attempts saved on the current browser/device.
- Hints and chart visits mark the active hand as assisted; assisted attempts are excluded from accuracy and streaks.

## Strategy scope

The pure engine in `src/strategy.js` implements initial two-card, total-dependent strategy for 4–8 deck **American peek** blackjack with doubling on any initial two cards. The same chart applies to all supported deck counts. It uses [Wizard of Odds’ multi-deck reference](https://wizardofodds.com/games/blackjack/strategy/4-decks/), including the H17 surrender and doubling exceptions.

Scenarios are balanced for training, not drawn from a continuous shoe. This is a first-decision quiz; cards are not played out. Single/double deck, composition-dependent exceptions, European no-hole-card rules, re-splitting decisions, counting deviations, and side bets are not implemented. Strategy rules should be independently reviewed before adding a new rule family.

## Growing the application

The current app can be hosted as static files on a CDN; each visitor’s quiz runs locally and no backend scales with traffic. `src/strategy.js` is independent of the UI, `src/storage.js` isolates browser persistence, and `src/app.js` composes the experience.

To add accounts and cross-device progress, replace the storage adapter with an authenticated API and persist the existing attempt schema. Keep strategy decisions on the server as well if adding ranked challenges. Add new deck/rule families as separate verified strategy providers rather than silently reusing the current chart. The versioned local storage key supports future migrations. Limit history or paginate server queries as data grows. No synchronization or authentication is implied by the current local storage.

## Hosting

`.openai/hosting.json` records the private Sites deployment identity. Only `dist/` is published. Source is kept separately from the build artifact.
