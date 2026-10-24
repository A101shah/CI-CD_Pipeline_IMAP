import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Cloud, CloudOff, ExternalLink, LoaderCircle, PlugZap, ShieldCheck } from "lucide-react";
import {
  cleanCloudUrl, getCloudBaseUrl, probeCloud, restoreCloudDefault,
  storeCloudUrl, useBrowserDemoPreference
} from "./cloudConfig";

export default function CloudBackendPanel() {
  const current=getCloudBaseUrl();
  const [candidate,setCandidate]=useState(current);
  const [editing,setEditing]=useState(false);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState("");
  const [feedback,setFeedback]=useState("");

  const connect=async(e:FormEvent)=>{
    e.preventDefault();setPending(true);setError("");setFeedback("Connecting to FastAPI; sleeping cloud instances can take a moment to wake.");
    try {
      const result=await probeCloud(candidate);
      storeCloudUrl(result.base);
      window.location.reload();
    } catch(e) {setError(e instanceof Error?e.message:"Could not connect to FastAPI");setFeedback("");}
    finally{setPending(false);}
  };
  const demo=()=>{
    useBrowserDemoPreference();
    window.location.reload();
  };
  const reset=()=>{
    restoreCloudDefault();
    window.location.reload();
  };
  return <section className={"cloud-connection "+(current?"cloud-online":"cloud-demo")} aria-label="Cloud backend connection">
    <div className="cloud-status-icon">{current?<Cloud size={22}/>:<CloudOff size={22}/>}</div>
    <div className="cloud-main">
      <div className="cloud-kicker">{current?"REMOTE FASTAPI / DOCKER MODE":"GITHUB PAGES / BROWSER DEMO MODE"}</div>
      <strong>{current?"Using the cloud Docker backend":"Cloud backend is not configured yet"}</strong>
      <p>{current
        ? <>Transaction scoring, cases, and <b>Dog API v2</b> requests are sent to the hosted Python service at <a href={current+"/docs"} target="_blank" rel="noreferrer">{current} <ExternalLink size={11}/></a>. This public academic demo has no authentication.</>
        : <>All dashboard pages work in browser-demo mode. Connect the Render HTTPS URL to switch transactions, investigations, and <b>Dog API v2</b> to the actual FastAPI backend.</>}</p>
      {current&&<div className="cloud-confirm"><CheckCircle2 size={14}/> Cloud endpoint configured · data is shared in the server session</div>}
      {editing&&<form className="cloud-connect-form" onSubmit={connect}>
        <label htmlFor="cloud-url">Public HTTPS address of your Docker/FastAPI service</label>
        <div className="cloud-connect-controls">
          <input id="cloud-url" value={candidate} onChange={e=>setCandidate(e.target.value)} placeholder="https://your-service.onrender.com" autoComplete="url" spellCheck={false}/>
          <button className="primary-btn" type="submit" disabled={pending||!cleanCloudUrl(candidate)}>{pending?<LoaderCircle size={15} className="spin"/>:<PlugZap size={15}/>} Verify & connect</button>
        </div>
        {feedback&&<small className="cloud-feedback" role="status">{feedback}</small>}
        {error&&<small className="cloud-error" role="alert">{error}</small>}
        <small className="cloud-disclaimer"><ShieldCheck size={13}/> The URL must point to our FraudGate API, serve /health, and allow the GitHub Pages origin with CORS. Never enter tokens or payment credentials.</small>
      </form>}
    </div>
    <div className="cloud-actions">
      <button type="button" className="outline-btn" onClick={()=>{setEditing(!editing);setError("");setFeedback("");}}>{editing?"Close":"Connect cloud API"}</button>
      {current?<button className="cloud-alt" type="button" onClick={demo}>Use browser demo</button>
        :<button className="cloud-alt" type="button" onClick={reset}>Use configured default</button>}
    </div>
  </section>;
}
