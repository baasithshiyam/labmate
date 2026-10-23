# Labmate.lk Virtual Lab

An interactive 3D laboratory for [Labmate.lk](https://labmate.lk). Visitors walk in through the lobby, look around the lab, inspect chemicals, glassware, instruments and safety equipment, run simulated experiments at the bench, and talk to the sales agent for contact details.

Built with Vite, React 19, Three.js r186, React Three Fiber 9, drei 10, Tailwind CSS 4 and Zustand.

## Run it locally

You need Node.js 20 or later.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit tests for the chemistry engine and the sales agent |
| `npm run build` | Type-checks and builds the site into `dist/` |
| `npm run preview` | Serves the built `dist/` folder locally |
| `npm run lint` | Lints the source with oxlint |

Add `?view=2d` to the URL to open the simple 2D guide, or `?quality=low` / `?quality=high` to override the automatic graphics setting.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes the site on every push to `main`.

1. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions** (one-time).
2. Push to `main`. The site appears at `https://<your-user>.github.io/labmate/`.

The build uses relative asset paths (`base: "./"` in `vite.config.ts`), so it also works on a custom domain without changes.

## What's inside

- **Lobby and entrance**: the visit starts outside the sliding glass doors.
- **Sales desk**: the agent greets visitors, shares the phone number and email (tap to call, email or copy), explains what Labmate supplies, and can take visitors to any area.
- **Chemical store, glassware, instruments, safety corner**: click any labelled item for a panel with a rotatable 3D preview, uses, good practice and, for chemicals, the formula, CAS number and hazard pictograms.
- **Experiment bench**: 17 reagents, two beakers, a conical flask and three test tubes. A simplified chemistry model produces pH changes, indicator colours, precipitates, fizzing gas and foam. Eight guided experiments walk through classic reactions. It is clearly labelled as a learning simulation.
- **2D guide**: devices without WebGL get the same content, bench and agent as a normal web page.

## Editing the content

All content lives in `src/data/` as JSON:

| File | Contents |
| --- | --- |
| `company.json` | Name, phone, email, and optional `address`, `mapUrl` and `hours`. The agent uses whatever is filled in; empty fields make it point visitors to phone or email. |
| `items.json` | Equipment, glassware and safety items: name, description, uses and tips. |
| `chemicals.json` | Chemicals on the shelves and at the bench: formula, CAS number, hazards and handling. |
| `experiments.json` | The guided experiments and their explanations. |

Product descriptions are general educational text about each item type. They do not claim specific brands, grades, pack sizes or prices. Add real stock details here when they are available.

The bench chemistry is in `src/chem/engine.ts`, covered by `src/chem/engine.test.ts`. A new bench reagent needs an entry in `REAGENTS` there, an entry with `"bench": true` in `chemicals.json`, and a place in `rackOrder` in `src/data/index.ts`.

## Project layout

```
src/
  data/       JSON content and typed accessors
  chem/       chemistry engine and its tests
  lib/        sales agent replies, hazard pictograms, device checks
  state/      Zustand stores for the lab and the bench
  scene/      3D room, zones, models, bench, controls and lighting
  ui/         HUD, panels, agent chat, bench controls, 2D guide
```
