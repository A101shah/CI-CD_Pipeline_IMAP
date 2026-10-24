# FraudGate 2.0 — Fraud Risk Analytics and CI/CD Monitoring

An enterprise-inspired **educational FinTech analytics application** built with React, TypeScript, Recharts, FastAPI, Pytest, Docker and GitHub Actions.

> All transaction records are synthetic and deterministic. This application does not process real payments or establish genuine fraud probabilities.

## What it includes

- **Overview:** date-range filtering, KPI cards, interactive transaction volume and flag charts, decision donut, merchant category comparisons, risk signal leaders, recent transactions.
- **Transaction Explorer:** search by ID/merchant/country, filter decisions and categories, inspect explanations in a detail drawer, CSV export, pagination.
- **Investigation Queue:** review/block decision queue with OPEN, INVESTIGATING, RESOLVED statuses. Changes are in-memory and not persistent across restarts.
- **Risk Decision Lab:** six deterministic rules, three quick presets and a simulated evaluation form; scores and triggered evidence are reported by the actual API.
- **CI/CD Operations Center:** read-only public GitHub Actions runs, current status, commit history and a visual quality-gate pipeline. Gracefully shows unavailable when GitHub cannot be reached.
- **DevOps:** frontend tests and TypeScript build + backend tests and coverage + Docker multi-stage build + container smoke test on every push.

## Problem statement

Fraud-risk software changes must be tested and reproducible. Develop a prototype financial transaction risk-screening application with transparent rules, analytics, investigations and a CI/CD monitoring dashboard. Use GitHub Actions to automatically test the Python and React applications on every push, package the application into a Docker image, and confirm the container responds to an operational health check.

## Architecture

\`\`\`text
React 19 / TypeScript / Recharts / CSS
                │  /api
                ▼
          FastAPI + Pydantic
          ├── Risk rules
          ├── Synthetic data / investigations
          └── Public GitHub Actions API (read-only)
                │
    Docker (Node build → Python runtime)

Every push
   ├── Backend Pytest + coverage
   ├── Frontend Vitest + TypeScript/Vite build
   └── Docker Buildx after both pass
          └── Start container and verify /health
\`\`\`

The frontend is compiled into the Docker image and served by FastAPI at the same origin, so no CORS configuration or external frontend host is required.

## Start locally with Python + frontend development server

Requirements: **Python 3.12+**, **Node.js 22+**.

Windows PowerShell terminal 1:

\`\`\`powershell
git clone https://github.com/A101shah/CI-CD_Pipeline_IMAP.git
cd CI-CD_Pipeline_IMAP
py -3.12 -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload
\`\`\`

Terminal 2:

\`\`\`powershell
cd CI-CD_Pipeline_IMAP\\frontend
npm install
npm run dev
\`\`\`

Open **http://localhost:5173** for the dashboard. API docs: **http://localhost:8000/docs**.

Testing:

\`\`\`bash
python -m pytest -v --cov=app --cov-report=term-missing --cov-fail-under=90
cd frontend
npm run test
npm run build
\`\`\`

## Docker

\`\`\`bash
docker build -t fraudgate:v2 .
docker run --rm -p 8000:8000 fraudgate:v2
\`\`\`

Open **http://localhost:8000**. Docker builds the frontend first (Node 22), then copies the static files into the lightweight Python 3.12 container. No registry credentials are needed.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /health | Container health |
| GET | /api/v1/rules | Risk rules |
| POST | /api/v1/evaluate | Score a synthetic transaction and add it to the in-memory session |
| GET | /api/v1/transactions | Last synthetic and simulated-session transactions |
| GET | /api/v1/cases | Review/block investigations |
| PATCH | /api/v1/cases/{id} | Change in-memory case status |
| GET | /api/v1/pipeline | Recent public GitHub Actions runs |
| GET | /docs | Swagger/OpenAPI |

Sample risk evaluation:

\`\`\`json
{
  "transaction_id": "DEMO-001",
  "amount_inr": 85000,
  "country": "IN",
  "home_country": "IN",
  "transactions_last_hour": 5,
  "device_is_new": true,
  "distance_from_home_km": 4,
  "merchant_category": "electronics"
}
\`\`\`

## Risk scores

| Rule | Score |
| --- | ---: |
| Amount ≥ ₹50,000 | 30 |
| ≥5 transactions in one hour | 25 |
| New device | 15 |
| Cross-border transaction | 15 |
| ≥1,000 km from home | 15 |
| Gift-card merchant | 10 |

Score capped at 100. Approve: 0–39, Review: 40–69, Block: 70–100. These thresholds are illustrative and are **not** calibrated from an actual banking dataset.

## Deployment

The repository includes \`render.yaml\` as an optional Render Blueprint for a Docker web service with \`/health\` and \`checksPass\` auto-deploy gating. **Pushing code does not itself deploy a service:** connect the repo through the Render dashboard and explicitly create a service if a public URL is desired. Check the provider's current free-tier availability and limits before deployment.

For the academic assignment, the GitHub Actions pipeline builds and tests locally but intentionally does not publish an image or execute a cloud deployment.

## Privacy, caveats and evidence

- No payment cards, account passwords or real customer records.
- The baseline 480 synthetic transactions use a seeded random generator; they are not continuously ingested.
- Case actions and simulator entries are only stored in the running Python process and are reset on restart; multi-worker deployments do not share state.
- Metrics, time-series charts and rates reflect simulation data. They are not evidence of a fraud model's precision or recall.
- The GitHub status panel calls the public GitHub Actions REST API server-side without authentication and may hit a rate limit; the UI shows a clear unavailable state when this happens.
- No repository secrets are required by the default CI pipeline. Never commit tokens or passwords.
- Keep the project on one web-service instance to avoid inconsistencies in in-memory state.

Read \`docs/CI_CD_AND_SECRETS.md\` for assignment research concepts. Primary references: https://docs.github.com/en/actions and https://fastapi.tiangolo.com and https://docs.docker.com/build/ .

## Windows local-development troubleshooting

**Risk Decision Lab is blank or clicking Evaluate does nothing?**

1. In one PowerShell terminal, activate the Python environment at the repo root and start the API:

   ```powershell
   cd D:\\IMAP_CI_CD\\CI-CD_Pipeline_IMAP
   .\\.venv\\Scripts\\Activate.ps1
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Verify `http://127.0.0.1:8000/health` returns `{"status":"ok","service":"fraudgate"}`.
3. In a **second** PowerShell terminal, run `cd frontend` from the repo root and start `npm run dev`. Open `http://localhost:5173`.
4. The Vite proxy deliberately targets `127.0.0.1:8000` rather than `localhost` to avoid Windows IPv4/IPv6 resolution mismatch.
5. Open the browser developer tools (F12 → Network), submit a sample transaction and inspect `POST /api/v1/evaluate`. A successful request is HTTP 200. A 422 response means a form input did not pass schema validation; the UI now displays field-specific feedback.

After pulling changes, restart **both** the Python and Vite development servers, then hard-refresh the dashboard.

## Required Dog API integration

The **Dog API Lab** is a separate sidebar view demonstrating integration with the public [Dog API v2](https://dogapi.dog/docs/api-v2). It uses `GET /api/v1/dog/breeds` for the live catalog and `GET /api/v1/dog/facts?limit=3` for uncached facts. FastAPI normalizes the provider's JSON:API responses. Breed data is cached for five minutes. The user can search, filter, inspect profiles and attributed image links, and refresh results. Network errors return HTTP 503 without crashing the FinTech dashboard. This integration never changes fraud risk scoring.

Our additional `tests/test_dog_api.py` uses offline fixtures for valid API data, malformed data, invalid queries and network failures. GitHub Actions therefore tests integration behavior without depending on an external service being live. No GitHub secret is necessary because the Dog API is public and does not require an API token.

## GitHub Pages: full static dashboard (no Python runtime required)

Production Pages URL (after enabling Pages in Settings):
**https://a101shah.github.io/CI-CD_Pipeline_IMAP/**.

The repository supports two explicitly different modes:

- **Full-stack development and Docker:** React uses the FastAPI backend, with real Python server-side validation, session-only synthetic transactions, and the Docker CI smoke test.
- **GitHub Pages static deployment:** the React app works without any server. `VITE_STATIC_MODE=true` selects `frontend/src/staticApi.ts`, which reproduces the six rule-based risk scores locally. The browser starts with 480 seeded synthetic records, saves simulated transactions and case statuses in `localStorage` on that browser, and fetches GitHub Actions status and the Dog API v2 directly using public CORS-enabled endpoints. This is a browser-only educational simulation: there is no shared database or backend service.

Every push to `main` triggers `.github/workflows/pages.yml`. It tests React, builds the Vite assets with base path `/CI-CD_Pipeline_IMAP/`, uploads `frontend/dist` and deploys with the official GitHub Pages actions.

**One-time repository setting:** open GitHub → repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. Only repository administrators can change this setting. If GitHub Pages was not enabled yet, set it before expecting the website to load.

### Verify locally without FastAPI

```powershell
cd frontend
npm install
$env:VITE_STATIC_MODE="true"
npm run dev
```

Browse http://localhost:5173. To test the actual production subpath build, run `npm run build -- --base=/CI-CD_Pipeline_IMAP/`.

The GitHub Actions `ci.yml` backend/frontend/Docker quality gates remain intact. Publishing the static Pages dashboard is **not** publishing or running the FastAPI/Docker backend. Neither GitHub Pages nor this browser-only simulation processes real payments or saves shared transaction data.

## Docker images: GitHub Container Registry (GHCR)

Every push runs the backend and frontend quality gates. **Only after both pass** is the Docker image built and smoke-tested against `GET /health`. On trusted `main` pushes (and manual main-branch runs), GitHub Actions **publishes that same tested image** to GitHub Container Registry.

The workflow creates two tags:
- `ghcr.io/a101shah/fraudgate:latest` — points to the newest passing main-branch build.
- `ghcr.io/a101shah/fraudgate:sha-<first-12-commit-characters>` — stable per-commit tag, making it easy to demonstrate each new successful image.

Visit [GitHub Packages — FraudGate](https://github.com/users/A101shah/packages/container/package/fraudgate) or your [GitHub profile Packages tab](https://github.com/A101shah?tab=packages) after the first successful publication. The package may initially be **private**; change visibility in package settings if you want unauthenticated students or evaluators to pull it.

If the image is public, pull and run it with:

```powershell
docker pull ghcr.io/a101shah/fraudgate:latest
docker run --rm -p 8000:8000 ghcr.io/a101shah/fraudgate:latest
```

Then open `http://localhost:8000`. Private images require a separate `docker login ghcr.io` locally with an appropriately scoped token. **Never paste your personal token into source code or commit it to Git.** The automated workflow instead uses GitHub Actions' built-in `GITHUB_TOKEN` with job-scoped `packages: write` permission; no additional GitHub secret needs to be created.

Safety: Pull requests and pushes to non-main branches run tests and Docker checks but cannot publish packages. Failed tests or a failed container health check also prevent publication. The GitHub Pages frontend is deployed separately and does **not** execute the container.



## GitHub Pages + real cloud-hosted Docker/FastAPI + Dog API

This repository supports **a true frontend/backend cloud split** while preserving the local Docker and static demo options:

\`\`\`text
GitHub Actions -> Test (Python + React) -> Smoke-test Docker -> Publish GHCR
                                                              |
                                                    Optional Render deploy hook
                                                              |
                                   Render web service -> GHCR Docker image
                                          |                 |
                                       FastAPI -> real Dog API v2 (breeds + facts)
                                          ^
                           HTTPS/CORS REST calls
                                          |
                              GitHub Pages React app
\`\`\`

**The cloud service has to be created once; publishing to GHCR alone does not start Render.**

### 1. Deploy the prebuilt Docker image on Render

1. Open https://dashboard.render.com/ and create a new **Web Service** (or use the repository's \`render.yaml\` Blueprint).
2. Choose **Existing Image / Container Registry**, not a static site. The complete image reference is **\`ghcr.io/a101shah/fraudgate:latest\`**. The GHCR package must be public for anonymous pulls; private packages require a Render registry credential.
3. Choose the available plan (free if eligible), confirm the URL and health path **\`/health\`**, and deploy.
4. Use the Render-generated HTTPS service URL as the API root. Open \`https://<actual-service-name>.onrender.com/health\` to check it returns \`{"status":"ok","service":"fraudgate"}\`.
5. Test the required Dog API integration directly: \`/api/v1/dog/breeds\` and \`/api/v1/dog/facts?limit=3\`. FastAPI proxies these to \`dogapi.dog/api/v2\`; no Dog API key is required.

Render assigns the live URL; do not assume the service will be named \`fraudgate-api\` until the service is actually created.

### 2. Connect the GitHub Pages website to Render

Open **https://a101shah.github.io/CI-CD_Pipeline_IMAP/**. At the top of the dashboard, use the **Connect cloud API** panel, paste your actual Render HTTPS root URL and click **Verify & connect**. It checks \`/health\` and stores the URL locally in your browser. After success, React will call the *real backend* for transactions, risk decisions, investigations, pipeline information **and the Dog API v2 endpoints**.

While no cloud URL is connected, the GitHub Pages edition stays usable as the browser-only simulation; the panel labels that mode clearly. You can switch back at any time. Cloud demo transactions and investigations are in memory on the running server; they are **not stored in a database and not isolated by visitor**. Never submit real payment/card/customer data.

For a default cloud URL for **all visitors**, add a GitHub repository **Actions variable** (not a secret) named \`FRAUDGATE_API_URL\` with the actual public HTTPS Render origin. This is used at build time via \`VITE_CLOUD_API_URL\` in \`.github/workflows/pages.yml\`. Rerun the Pages workflow after creating/changing the variable. Individual visitors can still override the default through the panel.

### 3. Optional: automatically refresh the Render Docker service on new successful pushes

Image-backed Render services do **not** redeploy automatically when their upstream \`:latest\` tag changes. In the Render service Settings, copy the private **Deploy Hook URL** into GitHub repository **Settings → Secrets and variables → Actions → New repository secret**, named \`RENDER_DEPLOY_HOOK_URL\`.

After Python tests, frontend tests, image health check, and GHCR publication succeed on \`main\`, the CI workflow sends a POST to that hook (when configured). The hook must **never be committed, placed in a Vite variable, or shown publicly**. Without this secret, the pipeline still publishes the image, and the Render service can be updated with **Manual Deploy → Deploy latest reference**.

### 4. CORS and runtime configuration

FastAPI explicitly permits browser requests from \`https://a101shah.github.io\` and two local Vite development origins. Extra origins, if required, can be set using a comma-separated \`FRAUDGATE_CORS_ORIGINS\` environment variable on the cloud service. The Docker image uses the Render \`PORT\` environment variable and defaults to 8000 for local Docker/Desktop.

**Security scope:** This is an academic demonstration with unauthenticated API routes, transparent rules, synthetic financial records and in-memory state. It is **not suitable for public production financial transactions or real account data**. The Dog API Lab is an independent live external service integration.
