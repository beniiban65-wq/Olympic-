Railway deployment steps — Backend (Express) + Postgres

1) Prerequisites
   - Railway account: https://railway.app
   - Railway CLI (optional): `npm i -g railway`

2) Create a new project on Railway (Web UI)
   - Click "New Project" → "Provision PostgreSQL"
   - This adds a PostgreSQL plugin and sets `DATABASE_URL` automatically.

3) Connect your GitHub repo (recommended)
   - In Railway, select "Deploy from GitHub" and connect `Olymipic-` repo.
   - Select the repository `beniiban65-wq/Olympic-` and the `main` branch.

4) Service configuration
   - Railway will detect this is a Node service. Ensure the start command is `npm start` or use the provided `Procfile` (web: node server.js).
   - Ensure the service exposes port `3001` (the app uses `process.env.PORT || 3001`).

5) Environment
   - Railway provides `DATABASE_URL` when you add the Postgres plugin. No further action required.
   - Any other env vars can be added under Service → Variables.

6) Deploy
   - Trigger a deploy (Railway will build Docker image using the included `Dockerfile` or use its Node builder).
   - After deployment, Railway will show a URL (e.g., https://project-name.up.railway.app). The backend's `/api/menu` endpoint should be available at `https://<service>.up.railway.app/api/menu`.

7) Verify
   - Use curl or the browser to GET `/api/menu`.
     - `curl https://<service>.up.railway.app/api/menu`
   - Edit menu via PUT to `/api/menu` and confirm it persists (data stored in PostgreSQL).

8) Notes
   - The repo already includes `server.js` that reads `DATABASE_URL` and falls back to `data/menu.json` if DB is unavailable.
   - The `Procfile` and `Dockerfile` are included to simplify Railway builds.

If you'd like, I can attempt to run the Railway CLI here, but I need your Railway API key or OAuth access to connect — otherwise follow the steps above in the Railway dashboard.