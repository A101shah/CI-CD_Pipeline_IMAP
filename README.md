# 🐾 Pawly — Find your kind of wonderful

**A beautifully designed dog discovery and lifestyle matching app powered by the real [Dog API v2](https://dogapi.dog/docs/api-v2).**

> This repository previously contained FraudGate. Pawly is a full dog-themed redesign built to satisfy a dog API + CI/CD assignment. The previous work remains in Git history.

## What you can do

- **Explore real breed data and images** from the Dog API (not hardcoded demo breeds).
- **Search, sort and filter** by breed, category and listed hypoallergenic status.
- **Meet your match** with a transparent, rule-based lifestyle matcher using API breed traits.
- **Compare two breeds** across lifespan, weight, origin, and personality characteristics.
- **Save favourites** in browser localStorage without registration.
- **Read live facts** fetched from the `/facts` endpoint.
- **Open detailed breed profiles**, including photography attribution and original source links.
- **Enjoy a polished, responsive interface** on mobile and desktop.

## Real API integration

We use the no-key, browser-accessible [dogapi.dog API v2](https://dogapi.dog/docs/api-v2):

| Endpoint | Usage |
|---|---|
| `GET /api/v2/breeds` | Real searchable breed library |
| `GET /api/v2/groups` | Breed group classification |
| `GET /api/v2/facts?limit=1` | Live rotating facts |

Breed records use the JSON:API envelope (`data[].attributes`) and provide photos with attribution. Pawly displays photo credits with source links. No API token is embedded in the frontend. The API supports cross-origin browser requests.

The matchmaker is a transparent **heuristic based on available numeric traits**, not a machine-learning model or individual pet suitability guarantee. Missing data is not fabricated.

## Architecture

```text
Visitor -> GitHub Pages -> React/Vite static website
                         -> Browser fetch -> Dog API v2
                         -> Browser localStorage (favourites)

Developer push -> GitHub Actions -> Feature tests -> Production build
                                              -> Docker build
                                              -> Running container smoke test
                                              -> GHCR sha-<commit> tag (every passing push)
                                              -> GHCR latest tag (main pushes)
                                              -> GitHub Pages deploy (main pushes)
```

GitHub Pages hosts the **static frontend**. It does **not** run a Docker container. GitHub Container Registry stores the Docker image independently. Both are built from the same source.

## Develop locally

Requires Node.js 22+.

```bash
cd frontend
npm install
npm run dev
```

Visit the Vite URL shown in the terminal (usually `http://localhost:5173`).

### Run tests and build

```bash
cd frontend
npm test
npm run build
```

Tests cover data normalization, filters, scoring/matching, localStorage handling, comparison state and edge cases.

## Run Docker locally

From the repository root:

```bash
docker build -t pawly:local .
docker run --rm -p 8080:8080 pawly:local
```

Open `http://localhost:8080`. Container health endpoint: `http://localhost:8080/health`.

The image uses a Node.js build stage and an unprivileged Nginx runtime stage.

## GitHub Actions: images on **every successful push**

Workflow: [Pawly CI/CD](.github/workflows/ci.yml)

For every `push` (all branches), the workflow:

1. Runs the frontend unit tests and builds the React production bundle.
2. Builds the Docker image.
3. Starts it and checks both `/health` and the HTML page.
4. Logs in to GHCR with `GITHUB_TOKEN` and pushes `ghcr.io/a101shah/pawly:sha-<first-12-commit-characters>`.

Every passing `main` push additionally updates `ghcr.io/a101shah/pawly:latest` and deploys the frontend to GitHub Pages. A failing build/test prevents publication or deployment.

Pull requests test and build but do not publish untrusted PR images.

**Where to see images:** GitHub profile → **Packages** → **pawly**. New package visibility can default to private; set its visibility to public in Package settings if desired.

## GitHub Pages one-time setting

Go to **Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**. The workflow then uploads `frontend/dist` and deploys it **only after Docker verification succeeds**.

Expected address once Pages has been enabled and the workflow succeeds:

**https://a101shah.github.io/CI-CD_Pipeline_IMAP/**

The Vite config uses `base: './'`, so built paths work under the repository subpath.

## Limitations

- GitHub Pages is static hosting, not backend or Docker hosting.
- Favourites persist only in the current browser.
- Breed traits vary in completeness, and do not predict individual temperament.
- API images are licensed to their original creators; the UI displays creator/license links.
- Network failures are shown with an explicit retry action.
- Public Pages deployments may require one-time repository setup.
- Package visibility/public access might require a one-time GitHub Packages setting.

## Tech stack

React 19 · Vite · Lucide Icons · Dog API v2 · Vitest · Nginx · Docker · GitHub Actions · GitHub Pages · GitHub Container Registry

Built with curiosity and care. 🐾
