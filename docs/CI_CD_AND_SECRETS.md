# FraudGate — CI/CD research and GitHub Secrets

## CI versus CD

**Continuous Integration (CI)** runs automated checks whenever code changes. This project runs Pytest, enforces coverage, builds a container and smoke-tests its health endpoint.

**Continuous Delivery** makes a tested software artifact available for a human-approved release. **Continuous Deployment** releases passing code automatically without separate human approval.

The supplied workflow is **CI only**; the local Docker build is not publication or deployment.

## Workflow, job, step and runner

- **Workflow:** YAML automation defined in `.github/workflows/ci.yml`, triggered by pushes and pull requests.
- **Job:** A unit of work within a workflow. There are `test` and `docker-build` jobs; `needs: test` prevents building an image on failing tests.
- **Step:** An action or command in a job, such as checkout, install, pytest, Docker build or curl.
- **Runner:** A machine that runs a job; this project uses GitHub-hosted `ubuntu-latest`.

## GitHub Secrets and security

Never hardcode passwords, bank credentials, tokens or registry access keys in source files, commits or workflow YAML. Public Git history can be cloned indefinitely; removing credentials in later commits does not reliably erase past exposure. Rotate compromised credentials.

For secrets, open **GitHub repository → Settings → Secrets and variables → Actions → New repository secret**. Access from eligible workflow jobs through the `secrets` context, e.g. `${{ secrets.DOCKERHUB_TOKEN }}`. Redaction is not foolproof: avoid logging credentials and prefer short-lived, least-privilege tokens.

This particular starter **does not need secrets** because it builds a local image rather than publishing to Docker Hub. Publishing could be added as a separate optional job after configuring a `DOCKERHUB_USERNAME` variable and `DOCKERHUB_TOKEN` secret; it should run only after validation and only on trusted main-branch pushes.

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
