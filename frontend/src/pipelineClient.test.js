import { describe, it, expect, vi, afterEach } from 'vitest';
import { tagForRun, isFinished, readableStatus, triggerTest, findNewDispatch } from './pipelineClient.js';

afterEach(() => vi.unstubAllGlobals());
describe('CI/CD pipeline status', () => {
  it('assigns a distinct version for each run', () => {
    expect(tagForRun({id: 123, run_attempt: 1})).toBe('run-123-1');
    expect(tagForRun({id: 124, run_attempt: 1})).not.toBe(tagForRun({id: 123, run_attempt: 1}));
  });
  it('also distinguishes a rerun attempt', () => expect(tagForRun({id: 123, run_attempt: 2})).toBe('run-123-2'));
  it('distinguishes running from completed', () => {
    expect(isFinished({status: 'in_progress'})).toBe(false);
    expect(isFinished({status: 'completed'})).toBe(true);
  });
  it('does not call a failed run successful', () => expect(readableStatus({status: 'completed', conclusion: 'failure'})).toContain('failure'));
});
describe('GitHub Actions integration', () => {
  it('dispatches the workflow using main and bearer auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({workflow_run_id:789})});
    vi.stubGlobal('fetch', fetchMock);
    await expect(triggerTest('session-token')).resolves.toEqual({workflow_run_id:789});
    expect(fetchMock.mock.calls[0][0]).toContain('/actions/workflows/ci.yml/dispatches');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer session-token');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).ref).toBe('main');
  });
  it('fails with actionable message for denied access', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:403,json:async()=>({message:'Forbidden'})}));
    await expect(triggerTest('bad')).rejects.toThrow('Actions: Read and write');
  });
  it('detects newly dispatched runs instead of past ones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({workflow_runs:[
      {id:10,event:'workflow_dispatch',created_at:'2026-10-24T10:00:00Z'},
      {id:11,event:'workflow_dispatch',created_at:'2026-10-24T12:00:00Z'}
    ]})}));
    expect((await findNewDispatch('t','2026-10-24T11:59:55Z')).id).toBe(11);
  });
});
