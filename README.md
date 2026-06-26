# Project Zenith: The Celestial Eye

Project Zenith is a full-stack AI-powered digital observatory. The application combines a FastAPI astronomy backend with a Next.js immersive frontend for live ISS tracking, weather-aware observation scoring, satellite data, planetary position services, and a Gemini-powered cosmic narrator.

The project is structured as a monorepo:

```text
project-zenith/
  backend/    FastAPI API service for Render
  frontend/   Next.js 14 frontend for Vercel
  docs/       Project documentation placeholder
```

## Features

- Live ISS position endpoint with a secondary provider fallback.
- Weather data from Open-Meteo for observation conditions.
- Satellite TLE endpoint with graceful fallback data when public providers block requests.
- NASA Horizons planetary service with retry and request-format fixes.
- Gemini-powered narrator API for the chat experience.
- Immersive frontend using Next.js, Tailwind CSS, Framer Motion, Three.js, React Three Fiber, and CesiumJS.
- Frontend fallback mock data so the UI remains populated if an upstream provider is temporarily unavailable.

## Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic and pydantic-settings
- httpx and requests
- Skyfield, Astropy, NumPy, SGP4
- Google Gemini API through the Generative Language HTTP API

### Frontend

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Three.js, @react-three/fiber, @react-three/drei
- Framer Motion
- SWR
- Lucide React

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Utkarsh151-glitch/project-zenith.git
cd project-zenith
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` and set:

```env
GEMINI_API_KEY="your-real-gemini-api-key"
```

Run the backend:

```bash
uvicorn app.main:app --reload
```

Backend local URL:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/api/v1/health
```

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
copy .env.local.example .env.local
```

If `.env.local.example` is not present, create `frontend/.env.local` manually:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CESIUM_TOKEN=your-cesium-token-if-any
```

Run the frontend:

```bash
npm run dev
```

Frontend local URL:

```text
http://localhost:3000
```

## Important Environment Variables

### Backend variables for Render

Set these in Render service environment variables:

```env
APP_NAME=Project Zenith: The Celestial Eye
APP_VERSION=0.1.0
DEBUG=false
NASA_HORIZONS_URL=https://ssd.jpl.nasa.gov/api/horizons.api
CELESTRAK_URL=https://celestrak.org
OPEN_NOTIFY_URL=http://api.open-notify.org
WHERE_THE_ISS_URL=https://api.wheretheiss.at/v1/satellites/25544
OPEN_METEO_URL=https://api.open-meteo.com
ALT_TLE_URL=https://tle.ivanstanojevic.me/api/tle/
GEMINI_API_KEY=your-real-gemini-api-key
REDIS_URL=redis://localhost:6379/0
```

`REDIS_URL` is currently kept for future cache/queue support. The current API can run without a hosted Redis instance.

### Frontend variables for Vercel

Set these in Vercel project environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com
NEXT_PUBLIC_CESIUM_TOKEN=your-cesium-token-if-any
```

The Cesium token is optional for the current globe because the app can render with fallback imagery.

## Backend API Endpoints

Base URL locally:

```text
http://localhost:8000
```

Common endpoints:

```text
GET  /api/v1/health
GET  /api/v1/iss/live
GET  /api/v1/weather/current?latitude=28.6139&longitude=77.2090
GET  /api/v1/satellites/active
GET  /api/v1/planets/positions
POST /api/v1/narrator/ask
POST /api/narrator/ask
```

`/api/narrator/ask` is included as a compatibility route for older frontend calls. The preferred route is `/api/v1/narrator/ask`.

Example narrator request:

```json
{
  "query": "Is tonight good for stargazing?",
  "lat": 28.6139,
  "lon": 77.2090,
  "timestamp": "2026-06-27T00:00:00Z"
}
```

## Deploy Backend on Render

1. Push this repository to GitHub.
2. Open Render and choose **New Web Service**.
3. Connect the GitHub repository.
4. Use these settings:

```text
Root Directory: backend
Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

5. Add the backend environment variables listed above.
6. Deploy.
7. After deploy, open:

```text
https://your-render-backend-url.onrender.com/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "message": "Service is healthy.",
  "data": {
    "status": "ok"
  }
}
```

## Deploy Frontend on Vercel

1. Open Vercel and choose **Add New Project**.
2. Import this GitHub repository.
3. Configure:

```text
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

4. Add environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com
NEXT_PUBLIC_CESIUM_TOKEN=your-cesium-token-if-any
```

5. Deploy.
6. Open the Vercel URL and verify the dashboard loads.

## Deployment Order

Deploy in this order:

1. Backend on Render.
2. Copy the Render backend URL.
3. Add that URL as `NEXT_PUBLIC_API_URL` in Vercel.
4. Deploy frontend on Vercel.

If the frontend is deployed before the backend URL is set, the UI may fall back to mock data or fail to reach live APIs.

## Verification Checklist

Run these before deployment:

```bash
cd backend
python -m compileall app
python -c "from app.main import app; print(app.title)"
```

```bash
cd frontend
npm install
npm run build
```

After backend deployment:

```text
/api/v1/health returns 200
/api/v1/iss/live returns 200
/api/v1/narrator/ask returns 200 when GEMINI_API_KEY is configured
```

After frontend deployment:

```text
Home page loads
Navigation is visible
Ask the Celestial Eye section is visible
Chat responds through the Render API
```

## Notes on External Providers

CelesTrak and some public TLE services can block or disconnect requests depending on IP and rate limits. The backend handles this gracefully by returning fallback satellite data instead of failing the whole app.

This means a terminal warning about CelesTrak does not necessarily mean the app is broken. Check the final HTTP status. If `/api/v1/satellites/active` returns `200`, the app handled the provider failure correctly.

## Repository Safety

Do not commit these files:

```text
backend/.env
frontend/.env.local
.venv/
backend/.venv/
frontend/node_modules/
```

The repository includes only example environment files and source code.

## Team

Built for ASTRALWEB'26 by Team DO BRONXS.
