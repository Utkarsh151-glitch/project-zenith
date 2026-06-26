# Project Zenith — Frontend (The Celestial Eye)

The AI-powered digital observatory frontend for **ASTRALWEB'26**, by **Team DO BRONXS**.

A single-page immersive experience: a full-screen interactive Three.js star field +
nebula behind a glassmorphism UI that floats on top, an interactive CesiumJS globe, an
AI cosmic narrator, a live celestial-events timeline, and a full-sky planisphere.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + shadcn-style UI primitives (`components/ui`)
- **Three.js** via **@react-three/fiber** + **@react-three/drei** (star field, AI orb, mini Earth)
- **CesiumJS** (loaded via CDN inside a client component) for the 3D globe
- **Framer Motion** (scroll reveals, transitions)
- **SWR** (timed data refresh) · **Lucide React** (icons)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

The backend (FastAPI) lives at `../backend` and runs on `http://localhost:8000`:

```bash
cd ../backend
uvicorn app.main:app --reload
```

## Environment variables (`.env.local`)

| Variable                    | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`       | Backend base URL (default `http://localhost:8000`) |
| `NEXT_PUBLIC_CESIUM_TOKEN`  | Cesium Ion access token (optional — see below)     |

> The globe uses Cesium's bundled offline **Natural Earth II** imagery, so it renders
> with real continents even without a Cesium Ion token.

## API integration & graceful degradation

`lib/api.ts` provides typed wrappers over the backend. The live backend implements
`/api/v1/iss/live`, `/api/v1/weather/current`, `/api/v1/satellites/active` (real public
data via Open-Notify, Open-Meteo, CelesTrak) plus a `/api/v1/dashboard` orchestrator.

Every wrapper **falls back to realistic mock data** (`lib/mock.ts`) when the backend is
unreachable or an endpoint is not yet implemented, so the UI is always fully populated.
The nav bar shows a `LIVE` / `MOCK` indicator based on a backend health probe.

Refresh cadences (SWR): ISS position every **5s**, satellites every **30s**, weather /
observation score every **5 min**.

## Structure

```
app/                     # layout (fonts + persistent star field), page (section composition)
components/
  3d/                    # StarField, AIOrb, MiniEarth (react-three-fiber)
  observatory/           # ControlPanel, ObservationScore, GlobeView (Cesium), SkyMap, Observatory
  narrator/              # NarratorPanel, TypewriterText
  events/                # EventTimeline, EventCard
  ui/                    # shadcn-style primitives (button, card, input, badge)
  Navigation, Hero, About, Footer, SectionWrapper, LoadingOrbit, Providers
lib/
  api.ts                 # typed fetch wrappers (+ mock fallback)
  mock.ts                # realistic location-aware mock data
  types.ts, utils.ts
  hooks/                 # useLocation, useSkyData, useISSTracker
```
