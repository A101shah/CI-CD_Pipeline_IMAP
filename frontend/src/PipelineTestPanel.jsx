import React, { useEffect, useRef, useState } from 'react';
import { Workflow, Rocket, ShieldCheck, LockKeyhole, Eye, EyeOff, CheckCircle2,
  AlertTriangle, RotateCcw, ExternalLink, Github, Container, ArrowUpRight, CircleDot, Info, X } from 'lucide-react';
import { triggerTest, fetchRun, findNewDispatch, tagForRun, isFinished, readableStatus, WORKFLOW_URL, PACKAGE_URL } from './pipelineClient.js';
import './pipeline-test.css';

export default function PipelineTestPanel() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [starting, setStarting] = useState(false);
  const [watching, setWatching] = useState(false);
  const [triggerTime, setTriggerTime] = useState(null);
  const [run, setRun] = useState(null);
  const [runId, setRunId] = useState(null);
  const [error, setError] = useState('');
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  async function startBuild() {
    if (!token.trim()) { setError('Connect a fine-grained GitHub token before starting a build.'); return; }
    setError(''); setStarting(true); setRun(null); setRunId(null); setWatching(false);
    const started = new Date().toISOString();
    setTriggerTime(started);
    try {
      const result = await triggerTest(token.trim());
      if (!alive.current) return;
      setRunId(result.workflow_run_id || null);
      setWatching(true);
    } catch (e) {
      if (alive.current) setError(e.message || 'Unable to start the workflow.');
    } finally {
      if (alive.current) setStarting(false);
    }
  }

  useEffect(() => {
    if (!watching || !triggerTime) return;
    let stopped = false;
    let timer;
    let attempts = 0;
    async function poll() {
      if (stopped) return;
      try {
        const result = runId ? await fetchRun(token.trim(), runId) : await findNewDispatch(token.trim(), triggerTime);
        if (stopped) return;
        if (result) {
          setRun(result);
          if (!runId && result.id) setRunId(result.id);
          if (isFinished(result)) { setWatching(false); return; }
        }
      } catch (e) {
        if (!stopped) setError(e.message || 'Cannot retrieve the current GitHub status.');
      }
      attempts++;
      if (attempts >= 90) {
        if (!stopped) { setWatching(false); setError('Status updates timed out. The workflow may still be running; check GitHub Actions.'); }
      } else {
        timer = setTimeout(poll, 6000);
      }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [watching, triggerTime, runId, token]);

  const good = isFinished(run) && run.conclusion === 'success';
  const failed = isFinished(run) && !good;
  const imageTag = good ? tagForRun(run) : '';
  const imageName = 'ghcr.io/a101shah/pawly';
  const statusText = readableStatus(run);
  return <section className="inner-page pipeline-page">
    <div className="page-intro">
      <span className="eyebrow"><Workflow size={16}/> CI/CD CONTROL ROOM</span>
      <h1>One click. Fresh image<span>.</span></h1>
      <p>Launch your GitHub Actions quality gate, publish a new versioned Docker image and follow the result—all from Pawly, without making a fake code change.</p>
    </div>

    <div className="pipeline-banner">
      <div className="pipeline-banner-copy"><span className="pipe-kicker"><CircleDot size={14}/> DEVELOPER TOOLS</span>
        <h2>Meet the easiest<br/>way to test your pipeline.</h2>
        <p>Each successful run builds a uniquely labelled container and publishes it to GitHub Container Registry.</p>
      </div><div className="pipeline-banner-art"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><div className="art-box art-github"><Github size={31}/></div><div className="art-box art-action"><Workflow size={32}/></div><div className="art-box art-docker"><Container size={36}/></div></div>
    </div>

    <div className="pipeline-columns">
      <section className="pipeline-control">
        <div className="pipeline-card-heading"><div><span className="eyebrow">01 · AUTHENTICATE ONCE PER TAB</span><h2>Connect to GitHub</h2></div><span className="pipe-lock"><LockKeyhole size={20}/></span></div>
        <p className="pipeline-help">GitHub requires owner authorization before a website can launch builds. Enter a <strong>fine-grained personal access token</strong> limited to <strong>this repository</strong> with <strong>Actions: Read and write</strong>.</p>
        <label htmlFor="github-workflow-token" className="pipeline-label">GitHub access token</label>
        <div className="pipeline-token-row"><input id="github-workflow-token" autoComplete="off" spellCheck="false" type={showToken ? 'text' : 'password'} placeholder="github_pat_..." value={token} onChange={(e)=>setToken(e.target.value)} aria-label="Fine-grained GitHub token"/><button onClick={()=>setShowToken(!showToken)} aria-label={showToken ? 'Hide token' : 'Show token'}>{showToken ? <EyeOff size={17}/> : <Eye size={17}/>}</button><button onClick={()=>{setToken('');setError('');}} aria-label="Forget token" title="Forget token"><X size={17}/></button></div>
        <div className="pipeline-token-foot"><ShieldCheck size={16}/><span>The token stays in page memory, is sent only to GitHub's API and is never saved by Pawly. Refreshing clears it.</span></div>
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" className="pipeline-guide">Create a restricted GitHub token <ExternalLink size={14}/></a>
        <div className="pipeline-divider"/>
        <div className="pipeline-card-heading"><div><span className="eyebrow">02 · LAUNCH THE PIPELINE</span><h2>Build & publish</h2></div></div>
        <p className="pipeline-help">Automatically runs unit tests, checks the production build, starts a Docker container, checks its health and publishes the image only after every check passes.</p>
        <button className="primary-button pipeline-trigger" disabled={starting || watching || !token.trim()} onClick={startBuild}>
          {starting || watching ? <RotateCcw size={19} className="spinning"/> : <Rocket size={19}/>}
          {starting ? 'Requesting a build...' : watching ? 'Pipeline running...' : 'Run CI/CD test & create image'}
          {!starting && !watching && <ArrowUpRight size={17}/>}
        </button>
        <p className="pipeline-smallprint">This intentionally consumes a GitHub Actions runner. Use only when testing your project.</p>
        {error && <div className="pipeline-error"><AlertTriangle size={18}/><span>{error}</span></div>}
      </section>

      <section className="pipeline-results">
        <div className="pipeline-card-heading"><div><span className="eyebrow">LIVE RUN STATUS</span><h2>Your latest test</h2></div><span className={'pipe-state ' + (good?'pipe-success': failed ? 'pipe-failed' : watching ? 'pipe-running' : '')}>{good ? 'PASSED' : failed ? 'FAILED' : watching ? 'IN PROGRESS' : 'READY'}</span></div>
        <div className="pipeline-state-panel">
          <div className={'pipeline-state-icon ' + (good?'pipeline-state-ok':failed?'pipeline-state-bad':'')} >
            {good ? <CheckCircle2 size={29}/> : failed ? <AlertTriangle size={29}/> : watching ? <RotateCcw size={29} className="spinning"/> : <Container size={29}/>}
          </div>
          <h3>{run ? statusText : watching ? 'Connecting to GitHub Actions...' : 'Ready for your first test'}</h3>
          <p>{good ? 'The tested Docker image has been published with its own run version.' : failed ? 'The build did not publish. Open the workflow logs to investigate.' : watching ? 'GitHub is validating the app. This dashboard checks for progress automatically.' : 'Connect GitHub and click the test button. Your build status will appear here.'}</p>
        </div>
        <div className="pipeline-step-list">
          <div><span className={'pipe-step-circle ' + (run ? 'pipe-done' : '')}>{run ? <CheckCircle2 size={15}/> : '1'}</span><span>Dispatch to GitHub Actions</span><strong>{run ? 'Started' : watching ? 'Waiting' : 'Pending'}</strong></div>
          <div><span className={'pipe-step-circle ' + (good ? 'pipe-done' : failed ? 'pipe-step-bad' : '')}>{good ? <CheckCircle2 size={15}/> : '2'}</span><span>Test, build & container health</span><strong>{good ? 'Passed' : failed ? 'Failed' : watching ? 'In progress' : 'Pending'}</strong></div>
          <div><span className={'pipe-step-circle ' + (good ? 'pipe-done' : '')}>{good ? <CheckCircle2 size={15}/> : '3'}</span><span>Publish version to GHCR</span><strong>{good ? 'Published' : failed ? 'Skipped' : watching ? 'Waiting' : 'Pending'}</strong></div>
        </div>
        {good && <div className="pipeline-result-tag"><span><Container size={18}/> NEW DOCKER IMAGE TAG</span><code>{imageName}:{imageTag}</code><button onClick={() => navigator.clipboard?.writeText(imageName+':'+imageTag)}>Copy image tag</button></div>}
        <div className="pipeline-links"><a href={run?.html_url || WORKFLOW_URL} target="_blank" rel="noopener noreferrer"><Github size={16}/> View GitHub Actions <ExternalLink size={14}/></a><a href={PACKAGE_URL} target="_blank" rel="noopener noreferrer"><Container size={17}/> View Docker images <ExternalLink size={14}/></a></div>
      </section>
    </div>

    <div className="pipeline-note"><Info size={21}/><div><strong>Why does GitHub require a token?</strong><p>Pawly runs on public GitHub Pages. Allowing anonymous visitors to start your GitHub Actions jobs would expose your account to abusive build requests. This button uses your own permission-scoped GitHub credential, never a hardcoded repository secret. In a future version, a GitHub App plus a secure backend could offer sign-in without pasting any token.</p></div></div>
  </section>;
}
