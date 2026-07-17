# Tech Stack

Back to [[The Transfer Wheel]].

## Core
| Layer | Choice | Notes |
|---|---|---|
| Framework | **React 19** | Function components + hooks only; one class (`ErrorBoundary`) in `src/App.jsx` |
| Build tool | **Vite 8** | `npm run dev`, `npm run build`, `npm run preview` |
| Language | **JavaScript (JSX)** | No TypeScript; `@types/*` present only for editor hints |
| Styling | **Plain CSS** | All in `src/index.css` (+ `src/App.css`). **No Tailwind, no CSS-in-JS** |
| Backend | **Firebase** | Firestore (real-time DB) + Auth (Google + guest). Config in `src/firebase.js` |
| Hosting | **Vercel** | Deploys from `main` only. Firebase is only the DB/auth, not the host |
| Lint | **ESLint 10** | `npm run lint` |

## No heavy dependencies
`package.json` runtime deps are just `react`, `react-dom`, `firebase`. Everything else — wheel physics, match engine, formation rendering — is hand-written. See [[Architecture]].

## How to run
```bash
# Node lives at /opt/homebrew/bin (not on the default PATH for tooling)
PATH="/opt/homebrew/bin:$PATH" npm run dev
```
Then open the Vite dev URL. A game-in-progress is auto-saved to `localStorage` — see [[State & Persistence]].

## Aesthetic
Retro CM 00/01 monospace look — dark background, amber/gold accents, "Broadcast" redesign skin. Notable CSS gotchas:
- `index.css` has a global `border-radius: 0 !important` reset — rounded elements must override it explicitly.
- Kit-themed headers use a solid `--kit-primary` background (a primary→secondary gradient washes out on light kits).

## Extra tooling
- `npm run sim:sweep` → `scripts/sim-sweep.mjs` — batch-runs the match engine to balance-test outcomes.
- `firestore.rules` — Firestore security rules. `.firebaserc` / `firebase.json` — Firebase project wiring.
