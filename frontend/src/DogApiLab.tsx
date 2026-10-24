import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, ImageOff, PawPrint, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import { getDogBreeds, getDogFacts } from "./api";
import type { DogBreed, DogFact } from "./types";

function Photo({breed}:{breed:DogBreed}) {
  const [bad,setBad]=useState(false);
  useEffect(()=>setBad(false),[breed.id]);
  return breed.image_url&&!bad
    ? <div className="dog-image"><img src={breed.image_url} alt={breed.name} loading="lazy" onError={()=>setBad(true)}/></div>
    : <div className="dog-image dog-no-image"><ImageOff size={25}/>Image unavailable</div>;
}
function Credit({breed}:{breed:DogBreed}) {
  const credit=breed.image_credit;
  if(!breed.image_url||!credit)return null;
  return <small className="dog-photo-credit">Photo: {credit.author} · {credit.license}
    {credit.source_url.startsWith("https://")&&<a href={credit.source_url} target="_blank" rel="noreferrer" aria-label={"Image source for "+breed.name}><ExternalLink size={12}/></a>}
  </small>;
}
export default function DogApiLab() {
  const [breeds,setBreeds]=useState<DogBreed[]>([]);
  const [facts,setFacts]=useState<DogFact[]>([]);
  const [query,setQuery]=useState("");
  const [hypoOnly,setHypoOnly]=useState(false);
  const [visible,setVisible]=useState(12);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [loadingBreeds,setLoadingBreeds]=useState(true);
  const [loadingFacts,setLoadingFacts]=useState(true);
  const [errorBreeds,setErrorBreeds]=useState("");
  const [errorFacts,setErrorFacts]=useState("");
  const [elapsed,setElapsed]=useState<number|null>(null);

  async function loadBreeds() {
    setLoadingBreeds(true);setErrorBreeds("");
    const start=performance.now();
    try {
      const result=await getDogBreeds();
      setBreeds(result.breeds);setElapsed(Math.round(performance.now()-start));
      setSelectedId(old=>old&&result.breeds.some(b=>b.id===old)?old:(result.breeds[0]?.id??null));
    } catch(e) {setErrorBreeds(e instanceof Error?e.message:"Dog API is unavailable");}
    finally{setLoadingBreeds(false);}
  }
  async function loadFacts() {
    setLoadingFacts(true);setErrorFacts("");
    try{setFacts((await getDogFacts(3)).facts);}
    catch(e){setErrorFacts(e instanceof Error?e.message:"Unable to load facts");}
    finally{setLoadingFacts(false);}
  }
  useEffect(()=>{void loadBreeds();void loadFacts();},[]);
  const matching=useMemo(()=>breeds.filter(b=>(!hypoOnly||b.hypoallergenic)&&
    (b.name.toLowerCase().includes(query.trim().toLowerCase())||b.description.toLowerCase().includes(query.trim().toLowerCase()))
  ),[breeds,query,hypoOnly]);
  const chosen=breeds.find(b=>b.id===selectedId)??matching[0]??null;
  const status=errorBreeds?"Offline":loadingBreeds?"Connecting":"Connected";

  return <div className="dog-lab">
    <div className="page-title"><div><div className="eyebrow">EXTERNAL SERVICE / ASSIGNMENT API</div>
      <h1>Dog API Integration Lab</h1><p>Browse live breed profiles, credited images, and fresh facts through our tested FastAPI integration.</p></div>
      <a className="outline-btn" href="https://dogapi.dog/docs/api-v2" target="_blank" rel="noreferrer">Official Dog API docs <ExternalLink size={15}/></a>
    </div>
    <div className="dog-banner"><div className="dog-banner-icon"><PawPrint size={32}/></div>
      <div className="dog-banner-text"><div className="eyebrow">THIRD-PARTY API INTEGRATION</div><h2>Two APIs. One reliable platform.</h2>
        <p>This independent module demonstrates consuming a live external API, transforming JSON:API responses, handling outages, and testing integrations without depending on the external service during CI.</p>
        <div className="dog-meta"><span><CheckCircle2 size={14}/> Dog API v2</span><span><ShieldCheck size={14}/> No API key required</span><span><RefreshCw size={14}/> 5-minute breed cache</span></div>
      </div>
      <div className={"dog-health "+(errorBreeds?"dog-offline":"")}><span className="live-pulse"/>{status}{!loadingBreeds&&!errorBreeds&&elapsed!==null&&<small>{elapsed} ms</small>}</div>
    </div>
    <div className="dog-kpis"><div><span>Breeds available</span><strong>{loadingBreeds?"…":breeds.length}</strong><small>External provider data</small></div>
      <div><span>Dog API endpoints</span><strong>02</strong><small>Breeds and random facts</small></div>
      <div><span>Authentication</span><strong>None</strong><small>Public read-only integration</small></div></div>
    <div className="dog-columns"><section className="panel">
      <div className="panel-top"><div><h3>Breed explorer</h3><p>Search the live catalog and select a breed</p></div>
        <button className="dog-refresh" onClick={()=>void loadBreeds()} disabled={loadingBreeds} aria-label="Refresh breed list"><RefreshCw size={16} className={loadingBreeds?"spin":""}/></button></div>
      <div className="dog-filters"><label className="search-wrap"><Search size={16}/><input value={query} aria-label="Search dog breeds" placeholder="Find a breed..." onChange={e=>{setQuery(e.target.value);setVisible(12);}}/></label>
        <label className="dog-check"><input type="checkbox" checked={hypoOnly} onChange={e=>{setHypoOnly(e.target.checked);setVisible(12);}}/> Hypoallergenic only</label></div>
      {errorBreeds&&<div className="dog-error" role="alert"><AlertTriangle size={17}/>{errorBreeds}<button onClick={()=>void loadBreeds()}>Retry</button></div>}
      {loadingBreeds&&<div className="dog-loading"><RefreshCw className="spin" size={18}/>Loading breeds…</div>}
      {!loadingBreeds&&<div className="dog-gallery">{matching.slice(0,visible).map(b=><button type="button" key={b.id} className={"dog-card "+(chosen?.id===b.id?"chosen":"")} onClick={()=>setSelectedId(b.id)}>
        <Photo breed={b}/><div className="dog-card-info"><strong>{b.name}</strong><span>{b.life_min!=null&&b.life_max!=null?b.life_min+"–"+b.life_max+" years":"Lifespan unavailable"}</span><Credit breed={b}/></div>
      </button>)}</div>}
      {!loadingBreeds&&matching.length===0&&!errorBreeds&&<div className="dog-loading">No matching breeds found.</div>}
      {matching.length>visible&&<button className="dog-more" onClick={()=>setVisible(n=>n+12)}>Show more <ArrowRight size={16}/></button>}
      {!loadingBreeds&&<div className="dog-count">Showing {Math.min(matching.length,visible)} of {matching.length} matches</div>}
    </section>
    <div className="dog-right">
      <section className="panel"><div className="panel-top"><div><h3>Breed profile</h3><p>Live attributes & image attribution</p></div><PawPrint size={19}/></div>
        {chosen?<div><div className="dog-featured"><Photo breed={chosen}/><Credit breed={chosen}/></div><div className="dog-profile">
          <div className="eyebrow">BREED INTELLIGENCE</div><h2>{chosen.name}</h2><p>{chosen.description||"No description supplied by the Dog API."}</p>
          <div className="dog-info-row"><span>Typical lifespan</span><b>{chosen.life_min!=null&&chosen.life_max!=null?chosen.life_min+"–"+chosen.life_max+" years":"Unknown"}</b></div>
          <div className="dog-info-row"><span>Hypoallergenic</span><b>{chosen.hypoallergenic?"Reported yes":"Not reported yes"}</b></div>
          <div className="dog-info-row"><span>Source</span><b>dogapi.dog</b></div>
        </div></div>:<div className="dog-loading">Select a breed to view details.</div>}
      </section>
      <section className="panel"><div className="panel-top"><div><h3>Fresh dog facts</h3><p>Retrieved again on each refresh</p></div>
        <button className="dog-refresh" disabled={loadingFacts} onClick={()=>void loadFacts()} aria-label="Fetch new dog facts"><RefreshCw size={16} className={loadingFacts?"spin":""}/></button></div>
        {errorFacts&&<div className="dog-error" role="alert"><AlertTriangle size={17}/>{errorFacts}</div>}
        {loadingFacts?<div className="dog-loading"><Sparkles size={18}/>Loading facts…</div>:<div className="dog-facts">{facts.map((f,i)=><div className="dog-fact" key={f.id||i}><Sparkles size={18}/><p>{f.text}</p></div>)}</div>}
      </section>
    </div></div>
    <div className="dog-note"><ShieldCheck size={21}/><div><b>CI/CD evidence: an isolated external integration</b><p>All Dog API requests travel through FastAPI. Unit tests mock the provider's responses, invalid payloads and outages, so our GitHub Actions pipeline works even if dogapi.dog is temporarily unavailable. Dog information is not used for transaction risk decisions.</p></div></div>
  </div>;
}
