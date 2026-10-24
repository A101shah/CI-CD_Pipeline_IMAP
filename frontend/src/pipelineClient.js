export const REPO = 'A101shah/CI-CD_Pipeline_IMAP';
export const WORKFLOW_URL = 'https://github.com/' + REPO + '/actions/workflows/ci.yml';
export const PACKAGE_URL = 'https://github.com/' + REPO + '/pkgs/container/pawly/versions';
const API = 'https://api.github.com/repos/' + REPO;

export function tagForRun(run) {
  return run?.id ? 'run-' + run.id + '-' + (run.run_attempt || 1) : '';
}

export function isFinished(run) {
  return run?.status === 'completed';
}

export function readableStatus(run) {
  if (!run) return 'Waiting for GitHub';
  if (run.status !== 'completed') return run.status === 'in_progress' ? 'Running tests and building Docker' : 'Queued on GitHub Actions';
  if (run.conclusion === 'success') return 'Completed successfully — image published';
  if (run.conclusion === 'cancelled') return 'Workflow was cancelled';
  return 'Workflow ' + (run.conclusion || 'failed') + ' — inspect the build logs';
}

async function request(path, token, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    },
    cache: 'no-store'
  });
  if (!response.ok) {
    let description = '';
    try { description = (await response.json()).message || ''; } catch { description = response.statusText; }
    if (response.status === 401) throw new Error('GitHub rejected this token. Check that it is valid and has Actions read/write access.');
    if (response.status === 403) throw new Error('Access denied. Use a fine-grained token for this repository with Actions: Read and write.');
    throw new Error('GitHub API error (' + response.status + '): ' + description);
  }
  if (response.status === 204) return {};
  return response.json();
}

export async function triggerTest(token) {
  return request('/actions/workflows/ci.yml/dispatches', token, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' })
  });
}

export async function fetchRun(token, id) {
  return request('/actions/runs/' + encodeURIComponent(String(id)), token);
}

export async function findNewDispatch(token, since) {
  const data = await request('/actions/workflows/ci.yml/runs?event=workflow_dispatch&branch=main&per_page=20', token);
  const cutoff = new Date(since).getTime() - 5000;
  return (data.workflow_runs || []).find((run) => run.event === 'workflow_dispatch' && new Date(run.created_at).getTime() >= cutoff) || null;
}
