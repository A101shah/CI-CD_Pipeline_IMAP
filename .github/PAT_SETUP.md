# Pawly CI/CD Test Button — Restricted GitHub Authentication

The public Pawly website includes **CI/CD Test Center**. You can start a real on-demand GitHub Actions workflow directly from the deployed website, then follow its status and open the published Docker image.

**GitHub Pages has no server-side secret storage.** Anonymous public buttons must not start privileged workflows because anyone could abuse your runner minutes and package storage. We intentionally require owner credentials and do not hardcode any token.

## One-time setup (owner)

1. Open [GitHub fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new).
2. Token name: `Pawly CI test`. Set a limited expiration.
3. **Resource owner:** `A101shah`.
4. **Repository access:** *Only select repositories* → `CI-CD_Pipeline_IMAP`.
5. **Repository permissions:** `Actions: Read and write` (GitHub sets `Metadata: Read`).
6. Generate the token. GitHub will show its value only once.
7. Open the Pawly website → **CI/CD Test Center** → paste token into the masked access-token field. Keep it private.
8. Click **Run CI/CD test & create image**.

The browser sends the token **only to `https://api.github.com`**, not to Dog API or any third party. It stays in React state (memory only), and is not saved in localStorage, sessionStorage, logs, or GitHub source. Refreshing clears it. Avoid running this feature in untrusted browsers or while browser extensions can read page content.

For stronger security and persistent one-click authentication, use a GitHub App with fine-grained Actions write permission and a secure backend; do not put GitHub App secrets or installation tokens into GitHub Pages.

## What happens when you click

- Sends `POST /repos/A101shah/CI-CD_Pipeline_IMAP/actions/workflows/ci.yml/dispatches` with `{ "ref": "main" }`.
- GitHub Actions runs tests and builds the Nginx Docker image.
- The image receives a run-specific OCI version label (ensures new digest even when the source SHA is unchanged).
- The successful image is pushed under `run-<run_id>-<attempt>`; `latest` and `sha-<commit>` are updated on `main`.
- The website polls GitHub Actions status and provides run and package links.

Publishing requires **all tests and container smoke checks to succeed**. The site never claims an image exists before the workflow reports success.

## Verify package versions

[GitHub Container Package Versions](https://github.com/A101shah/CI-CD_Pipeline_IMAP/pkgs/container/pawly/versions)

GitHub may consolidate multiple tags with an identical image digest. The new OCI label generated from `GITHUB_RUN_ID` and `GITHUB_RUN_ATTEMPT` creates a distinct digest for each requested build.

## Alternative without using a token in Pawly

Open [GitHub Actions: Pawly CI](https://github.com/A101shah/CI-CD_Pipeline_IMAP/actions/workflows/ci.yml), select **Run workflow** on `main`. This also publishes a new, unique Docker version. It requires a couple of clicks in GitHub.

## Troubleshooting

- **401**: Invalid or expired token.
- **403**: Insufficient permission; verify Actions Read and write and correct repository selection.
- **404**: Verify repository access and that `ci.yml` exists on the default branch.
- **API rate limits / network errors**: Open the GitHub Actions link to see whether dispatch succeeded. Do not click repeatedly.
- **Browser CORS restriction**: Use GitHub's **Run workflow** interface; never weaken CORS via insecure proxies.
