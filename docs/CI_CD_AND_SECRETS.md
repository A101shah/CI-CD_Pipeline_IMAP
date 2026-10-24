# FraudGate — CI/CD research and GitHub Secrets

## CI versus CD

**Continuous Integration (CI)** runs automated checks whenever code changes. This project runs Pytest, enforces coverage, builds a container and smoke-tests its health endpoint.

**Continuous Delivery** makes a tested software artifact available for a human-approved release. **Continuous Deployment** releases passing code automatically without separate human approval.

The workflow performs **CI and artifact publication**: after successful quality gates and a Docker health check, passing main-branch builds publish a versioned container image to GHCR. This is continuous delivery of a deployable container artifact, not continuous deployment of the backend to a running web service. GitHub Pages separately deploys a static frontend.

## Workflow, job, step and runner

- **Workflow:** YAML automation defined in `.github/workflows/ci.yml`, triggered by pushes and pull requests.
- **Job:** A unit of work within a workflow. There are `backend`, `frontend`, and `docker` jobs; `needs: [backend, frontend]` prevents building an image when tests or the frontend build fail. The Docker job smoke-tests the image and then conditionally publishes it to GHCR.
- **Step:** An action or command in a job, such as checkout, install, pytest, Docker build or curl.
- **Runner:** A machine that runs a job; this project uses GitHub-hosted `ubuntu-latest`.

## GitHub Secrets and security

Never hardcode passwords, bank credentials, tokens or registry access keys in source files, commits or workflow YAML. Public Git history can be cloned indefinitely; removing credentials in later commits does not reliably erase past exposure. Rotate compromised credentials.

For secrets, open **GitHub repository → Settings → Secrets and variables → Actions → New repository secret**. Access from eligible workflow jobs through the `secrets` context, e.g. `${{ secrets.DOCKERHUB_TOKEN }}`. Redaction is not foolproof: avoid logging credentials and prefer short-lived, least-privilege tokens.

**Implemented:** On successful trusted main-branch runs, the Docker job publishes its health-tested image to GitHub Container Registry (GHCR). The login step uses `${{ secrets.GITHUB_TOKEN }}` provided automatically by GitHub Actions, scoped to `contents: read` and `packages: write` on that job. No personal access token or new repository secret is required. Never hardcode usernames, passwords, or tokens. Pull requests and non-main branches only build/test; they never publish.

## Demonstration sequence and limitations

Show three dashboard risk scenarios, a green GitHub Actions run, then make a deliberately failing rule change on an isolated demo branch to demonstrate a failed unit test and skipped Docker build. Correct the rule to show a successful pipeline. Tests validate software correctness and reproducibility, **not actual fraud-detection performance**.

## Sources

- https://docs.github.com/en/actions
- https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.docker.com/build/

## Required external Dog API integration

The final project includes a dedicated **Dog API Lab**. The React UI requests `/api/v1/dog/breeds` and `/api/v1/dog/facts` from FastAPI. The backend uses `https://dogapi.dog/api/v2/breeds` and `https://dogapi.dog/api/v2/facts`, normalizes the upstream responses and returns JSON to React. Tests mock the external service, so CI succeeds independently of external network conditions. There is no Dog API credential to store as a GitHub Secret.

Current pipeline uses three jobs: `backend`, `frontend`, then `docker` using `needs: [backend, frontend]`. This updates the earlier simplified two-job description above.

## Published image tracking

Successful main-branch builds produce `ghcr.io/a101shah/fraudgate:latest` and `ghcr.io/a101shah/fraudgate:sha-<12-char-commit>`. Check the package versions under the GitHub profile's **Packages** section, or open the publishing step in the GitHub Actions workflow to view the manifest verification and image tags. Note that the default visibility may be private until changed by the package owner.
