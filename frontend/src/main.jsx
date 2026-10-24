import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PawPrint, Compass, Heart, Scale, Sparkles, BookOpen, Search, ArrowUpRight,
  ArrowRight, Check, X, RefreshCw, Menu, MapPin, Clock3, Activity, ShieldCheck,
  Globe2, Leaf, Users, ExternalLink, Zap, Dog, Star, Sun, Plus,
  SlidersHorizontal, ChevronRight, Github, Info, ArrowLeft
} from 'lucide-react';
import { getBreeds, getGroups, getFact } from './dogApi.js';
import { normalizeBreed, rangeLabel, filterBreeds, rankMatches, toggleId, readSavedIds } from './discovery.js';
import './style.css';

const NAV = [
  { id: 'discover', title: 'Discover', icon: Compass },
  { id: 'match', title: 'Matchmaker', icon: Sparkles },
  { id: 'saved', title: 'Saved breeds', icon: Heart },
  { id: 'compare', title: 'Compare', icon: Scale },
  { id: 'about', title: 'About Pawly', icon: BookOpen }
];

const DEFAULT_PREFS = { space: 'apartment', activity: 'medium', experience: 'first', family: 'yes' };
const personalityKeys = [
  ['energy', 'Energy'], ['trainability', 'Trainability'],
  ['good_with_children', 'With children'], ['apartment_friendly', 'Apartment friendly'],
  ['grooming', 'Grooming needs'], ['shedding', 'Shedding']
];

function Photo({ breed, large = false, className = '' }) {
  const [broken, setBroken] = useState(false);
  const credit = breed?.imageCredit;
  const url = large ? breed?.image : breed?.imageThumb;
  return <div className={'photo ' + className}>
    {url && !broken
      ? <img src={url} alt={breed.name + ' dog'} loading={large ? 'eager' : 'lazy'} onError={() => setBroken(true)} />
      : <div className="photo-fallback"><PawPrint size={50} strokeWidth={1.3}/><span>Every pup has a story</span></div>}
    {credit && !broken && <a className="photo-credit" href={credit.source_url || credit.license_url || '#'} target="_blank" rel="noopener noreferrer" title="View photo attribution" onClick={(event) => event.stopPropagation()}>
      Photo: {credit.author || 'Contributor'} · {credit.license || 'Licensed'}
    </a>}
  </div>;
}

function Brand({ onClick }) {
  return <button className="brand" onClick={onClick} aria-label="Pawly home">
    <span className="brand-mark"><PawPrint size={23} fill="currentColor" strokeWidth={1.9}/></span>
    <span>pawly<span className="brand-dot">.</span></span>
  </button>;
}

function Sidebar({ active, setActive, savedCount, compareCount, menuOpen, closeMenu }) {
  return <>
    {menuOpen && <button className="mobile-shade" aria-label="Close menu" onClick={closeMenu}/>}
    <aside className={'sidebar ' + (menuOpen ? 'sidebar-open' : '')}>
      <Brand onClick={() => { setActive('discover'); closeMenu(); }}/>
      <div className="side-label">YOUR SPACE</div>
      <nav aria-label="Main navigation" className="side-nav">
        {NAV.map(({ id, title, icon: Icon }) =>
          <button key={id} className={'side-link ' + (active === id ? 'side-link-active' : '')} onClick={() => { setActive(id); closeMenu(); }}>
            <Icon size={18} strokeWidth={2}/><span>{title}</span>
            {id === 'saved' && savedCount > 0 && <span className="nav-counter">{savedCount}</span>}
            {id === 'compare' && compareCount > 0 && <span className="nav-counter">{compareCount}</span>}
          </button>
        )}
      </nav>
      <div className="sidebar-bottom">
        <div className="tip-card">
          <div className="tip-icon"><Sparkles size={17}/></div>
          <strong>Find your perfect fit</strong>
          <p>A little personality, a lot of puppy love.</p>
          <button onClick={() => { setActive('match'); closeMenu(); }}>Take the quiz <ArrowUpRight size={15}/></button>
        </div>
        <div className="side-signoff"><span className="status-light"/><span>Made for curious dog lovers</span></div>
      </div>
    </aside>
  </>;
}

function BreedCard({ breed, isSaved, isCompared, onOpen, onSave, onCompare, index = 0 }) {
  return <article className="breed-card" style={{ animationDelay: Math.min(index, 9) * 55 + 'ms' }}>
    <div className="breed-image" onClick={() => onOpen(breed)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(breed)}>
      <Photo key={breed.id} breed={breed}/>
      <button className={'favourite-round ' + (isSaved ? 'is-saved' : '')} aria-label={isSaved ? 'Remove ' + breed.name + ' from saved' : 'Save ' + breed.name} onClick={(e) => { e.stopPropagation(); onSave(breed.id); }}>
        <Heart size={19} fill={isSaved ? 'currentColor' : 'none'}/>
      </button>
    </div>
    <div className="breed-card-body">
      <div className="breed-category">{breed.group}</div>
      <button className="breed-title" onClick={() => onOpen(breed)}>{breed.name}<ArrowUpRight size={17}/></button>
      <div className="breed-meta"><span><MapPin size={14}/>{breed.origin}</span><span><Clock3 size={14}/>{rangeLabel(breed.life, ' yrs')}</span></div>
      <div className="card-divider"/>
      <div className="breed-card-foot">
        <span className="mini-trait"><span className="mini-paw">✦</span> {breed.traits?.temperament?.[0] || 'Discover me'}</span>
        <button className={'compare-add ' + (isCompared ? 'compare-added' : '')} onClick={() => onCompare(breed.id)} aria-label={isCompared ? 'Remove from comparison' : 'Add to comparison'}>
          {isCompared ? <Check size={16}/> : <Plus size={16}/>} {isCompared ? 'Added' : 'Compare'}
        </button>
      </div>
    </div>
  </article>;
}

function BreedGrid({ breeds, saved, compared, onOpen, onSave, onCompare, emptyMessage }) {
  if (!breeds.length) return <div className="empty-state"><span className="empty-icon"><Dog size={36}/></span><h3>No pups found just yet</h3><p>{emptyMessage || 'Try a different search or reset the filters.'}</p></div>;
  return <div className="breed-grid">{breeds.map((b, index) => <BreedCard key={b.id} breed={b} index={index} isSaved={saved.includes(b.id)} isCompared={compared.includes(b.id)} onOpen={onOpen} onSave={onSave} onCompare={onCompare}/>)}</div>;
}

function SectionHeading({ eyebrow, title, description, action }) {
  return <div className="section-heading">
    <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {action}
  </div>;
}

function Metric({ icon: Icon, number, label, color }) {
  return <div className="metric-card"><div className={'metric-icon ' + color}><Icon size={21}/></div><div><strong>{number}</strong><span>{label}</span></div></div>;
}

function DetailModal({ breed, onClose, isSaved, onSave, isCompared, onCompare }) {
  useEffect(() => {
    const listener = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);
  if (!breed) return null;
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="detail-modal" role="dialog" aria-modal="true" aria-label={breed.name + ' details'} onMouseDown={(e) => e.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="Close detail"><X size={22}/></button>
      <div className="modal-photo"><Photo breed={breed} large/></div>
      <div className="modal-body">
        <div className="eyebrow">{breed.group} · Breed profile</div>
        <h2>{breed.name}</h2>
        <p className="modal-description">{breed.description}</p>
        <div className="modal-stats">
          <div><Clock3 size={18}/><span>Life span</span><strong>{rangeLabel(breed.life, ' years')}</strong></div>
          <div><Activity size={18}/><span>Male weight</span><strong>{rangeLabel(breed.weight, ' kg')}</strong></div>
          <div><Globe2 size={18}/><span>Origin</span><strong>{breed.origin}</strong></div>
          <div><Leaf size={18}/><span>Hypoallergenic</span><strong>{breed.hypoallergenic ? 'Listed as yes' : 'Not listed as yes'}</strong></div>
        </div>
        <h3 className="modal-subtitle">Personality snapshot <small>Available API traits, on a 0–5 scale</small></h3>
        <div className="trait-list">{personalityKeys.map(([key, label]) => {
          const val = breed.traits?.[key];
          return <div className="trait-row" key={key}><span>{label}</span><div className="trait-meter">{[0,1,2,3,4].map((i) => <span key={i} className={Number.isFinite(val) && i < val ? 'filled' : ''}/>)}</div><b>{Number.isFinite(val) ? val + '/5' : 'N/A'}</b></div>;
        })}</div>
        {breed.traits?.temperament?.length > 0 && <div className="temperament-chips">{breed.traits.temperament.slice(0, 6).map((t) => <span key={t}>{t}</span>)}</div>}
        <div className="modal-actions"><button className="primary-button" onClick={() => onSave(breed.id)}><Heart size={17} fill={isSaved ? 'currentColor' : 'none'}/>{isSaved ? 'Saved to favourites' : 'Save this breed'}</button>
          <button className="outline-button" onClick={() => onCompare(breed.id)}><Scale size={17}/>{isCompared ? 'Remove comparison' : 'Add to compare'}</button></div>
        {breed.sources.length > 0 && <a className="source-link" href={breed.sources[0].url} target="_blank" rel="noopener noreferrer">Learn more from source <ExternalLink size={14}/></a>}
        <p className="modal-disclaimer">Breed information is for discovery, not a guarantee of any individual dog's behaviour. Images are credited to their creators.</p>
      </div>
    </section>
  </div>;
}

function Choice({ label, value, selected, onClick }) {
  return <button type="button" className={'choice ' + (selected ? 'choice-active' : '')} onClick={() => onClick(value)}><span>{label}</span>{selected && <Check size={16}/>}</button>;
}

function App() {
  const [active, setActive] = useState('discover');
  const [menuOpen, setMenuOpen] = useState(false);
  const [breeds, setBreeds] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fact, setFact] = useState('');
  const [factLoading, setFactLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All breeds');
  const [onlyHypo, setOnlyHypo] = useState(false);
  const [sort, setSort] = useState('name');
  const [visible, setVisible] = useState(9);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState(() => readSavedIds(window.localStorage));
  const [compared, setCompared] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFS);
  const [quizDone, setQuizDone] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([getBreeds(controller.signal), getGroups(controller.signal)]).then(([dogRecords, groupRecords]) => {
      const lookup = Object.fromEntries(groupRecords.map((g) => [g.id, g.attributes?.name || 'Other breeds']));
      const normalized = dogRecords.map((item) => normalizeBreed(item, lookup)).filter((b) => b.id && b.image);
      setBreeds(normalized);
      setGroups([...new Set(normalized.map((b) => b.group))].sort());
      setLoading(false);
    }).catch((err) => { if (err.name !== 'AbortError') { setError(err.message || 'Unable to reach the Dog API.'); setLoading(false); } });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => { try { window.localStorage.setItem('pawly-favourites', JSON.stringify(saved)); } catch { /* private mode */ } }, [saved]);

  async function refreshFact() {
    setFactLoading(true);
    try { setFact(await getFact()); } catch { setFact('A wagging tail can brighten almost any day. Try again for a live dog fact.'); }
    finally { setFactLoading(false); }
  }
  useEffect(() => { refreshFact(); }, []);

  const filtered = useMemo(() => filterBreeds(breeds, { query, group, onlyHypo, sort }), [breeds, query, group, onlyHypo, sort]);
  const savedBreeds = useMemo(() => breeds.filter((b) => saved.includes(b.id)), [breeds, saved]);
  const comparison = useMemo(() => compared.map((id) => breeds.find((b) => b.id === id)).filter(Boolean), [breeds, compared]);
  const matches = useMemo(() => rankMatches(breeds, preferences).slice(0, 9), [breeds, preferences]);
  const heroBreed = useMemo(() => ['Golden Retriever', 'Samoyed', 'Shiba Inu', 'Labrador Retriever', 'Australian Shepherd'].map((n) => breeds.find((b) => b.name.toLowerCase() === n.toLowerCase())).find(Boolean) || breeds[0], [breeds]);
  const secondHero = breeds.find((b) => b.name === 'Corgi') || breeds.find((b) => b.name.includes('Corgi')) || breeds[6];
  function saveBreed(id) { setSaved((old) => toggleId(old, id)); }
  function compareBreed(id) { setCompared((old) => toggleId(old, id, 2)); }
  function goToDiscover() { setActive('discover'); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function pickRandom() { if (breeds.length) setSelected(breeds[Math.floor(Math.random() * breeds.length)]); }
  function changePref(key, value) { setPreferences((old) => ({ ...old, [key]: value })); setQuizDone(false); }
  const gridProps = { saved, compared, onOpen: setSelected, onSave: saveBreed, onCompare: compareBreed };

  return <div className="app-shell">
    <Sidebar active={active} setActive={setActive} savedCount={saved.length} compareCount={compared.length} menuOpen={menuOpen} closeMenu={() => setMenuOpen(false)}/>
    <div className="main-shell">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={24}/></button>
          <div className="breadcrumb">Your world of dogs <ChevronRight size={14}/><strong>{NAV.find((n) => n.id === active)?.title}</strong></div>
        </div>
        <div className="topbar-right">
          <div className="search-shell"><Search size={18}/><input aria-label="Search dog breeds" value={query} onFocus={() => setActive('discover')} onChange={(e) => { setQuery(e.target.value); setVisible(9); setActive('discover'); }} placeholder="Search any breed..." /><kbd>⌕</kbd></div>
          <span className={'connection-pill ' + (error ? 'connection-down' : '')}><span className="status-light"/>{loading ? 'Connecting...' : error ? 'API unavailable' : 'Live Dog API'}</span>
          <button className="avatar-button" title="Pawly explorer"><PawPrint size={22}/></button>
        </div>
      </header>

      <main className="content">
        {active === 'discover' && <>
          <section className="welcome-line"><span><Sun size={16}/> GOOD DAY, DOG LOVER</span><span>Curiosity looks good on you <span aria-hidden="true">✦</span></span></section>
          <section className="hero">
            <div className="hero-spark hero-spark-one">✳</div><div className="hero-spark hero-spark-two">✦</div>
            <div className="hero-copy"><span className="hero-eyebrow"><PawPrint size={15}/> THE HAPPIEST PLACE FOR DOG PEOPLE</span>
              <h1>Find your kind<br/>of <em>wonderful.</em></h1>
              <p>From tiny companions to gentle giants, explore the pawsibilities and meet the breed that feels like you.</p>
              <div className="hero-actions"><button className="primary-button" onClick={goToDiscover}>Explore dog breeds <ArrowRight size={18}/></button>
                <button className="text-button" onClick={() => setActive('match')}>Find my match <ArrowUpRight size={18}/></button></div>
              <div className="hero-proof"><span className="avatar-stack"><span>🐶</span><span>🐕</span><span>🐩</span></span><span>Hundreds of breeds.<br/><strong>One special connection.</strong></span></div>
            </div>
            <div className="hero-visual">
              {heroBreed && <div className="hero-photo-one"><Photo breed={heroBreed} large/></div>}
              {secondHero && <div className="hero-photo-two"><Photo breed={secondHero}/></div>}
              <div className="floating-note"><span className="note-heart"><Heart size={17} fill="currentColor"/></span><span>More than a pet<br/><strong>A best friend.</strong></span></div>
              <div className="hero-outline">P</div>
            </div>
          </section>

          <section className="metrics-row">
            <Metric icon={Dog} number={loading ? '...' : breeds.length + '+'} label="Breeds to discover" color="lavender"/>
            <Metric icon={Globe2} number={loading ? '...' : groups.length} label="Breed families" color="peach"/>
            <Metric icon={Heart} number={saved.length} label="Your favourites" color="pink"/>
            <Metric icon={ShieldCheck} number="100%" label="Curiosity encouraged" color="mint"/>
          </section>

          <section className="quick-panels">
            <div className="daily-fact"><div className="fact-top"><span className="eyebrow"><Sparkles size={15}/> A LITTLE SOMETHING TO SMILE ABOUT</span><button className="icon-ghost" onClick={refreshFact} disabled={factLoading} title="Another dog fact" aria-label="Refresh dog fact"><RefreshCw size={18} className={factLoading ? 'spinning' : ''}/></button></div>
              <div className="fact-body"><span className="big-quote">“</span><p>{factLoading ? 'Finding another lovely fact...' : fact || 'Discovering a fun fact...'}</p></div><div className="fact-bottom"><span>Powered by live Dog API facts</span><span>✦ THE DAILY WAG</span></div>
            </div>
            <div className="quiz-promo"><span className="promo-icon"><Sparkles size={24}/></span><span className="eyebrow">THE MATCHMAKER</span><h3>Who's your<br/>paw-fect match?</h3><p>Answer a few fun questions. Find your vibe.</p><button onClick={() => setActive('match')}>Take the quiz <ArrowRight size={18}/></button><div className="promo-doodle">♡</div></div>
          </section>

          <section className="explore-section" id="explore">
            <SectionHeading eyebrow="THE BREED LIBRARY" title="Meet the whole pack." description="A little browsing, a lot of falling in love." action={<button className="random-button" onClick={pickRandom}><Zap size={17}/> Surprise me</button>}/>
            <div className="filter-toolbar">
              <div className="group-scroller"><button onClick={() => { setGroup('All breeds'); setVisible(9); }} className={'filter-chip ' + (group === 'All breeds' ? 'filter-active' : '')}>All breeds</button>
                {groups.slice(0, 10).map((g) => <button key={g} onClick={() => { setGroup(g); setVisible(9); }} className={'filter-chip ' + (group === g ? 'filter-active' : '')}>{g}</button>)}
              </div>
              <div className="filter-controls">
                <label className="hypo-toggle"><input type="checkbox" checked={onlyHypo} onChange={(e) => { setOnlyHypo(e.target.checked); setVisible(9); }}/><span>Hypoallergenic</span></label>
                <label className="sort-control"><SlidersHorizontal size={15}/><select aria-label="Sort breeds" value={sort} onChange={(e) => setSort(e.target.value)}><option value="name">Name A–Z</option><option value="life">Longest life</option><option value="weight">Lightest first</option></select></label>
              </div>
            </div>
            {error ? <div className="error-banner"><Info size={20}/><div><strong>Couldn't load the dog library</strong><p>{error}</p></div><button onClick={() => setReloadKey((v) => v + 1)}>Try again <RefreshCw size={15}/></button></div> :
              loading ? <div className="loading-grid">{[1,2,3,4,5,6].map((n) => <div key={n} className="skeleton-card"><div/><span/><span/></div>)}</div> : <>
              <div className="result-count">Showing {Math.min(filtered.length, visible)} of {filtered.length} breeds <span>· Photos and details from Dog API</span></div>
              <BreedGrid breeds={filtered.slice(0, visible)} {...gridProps}/>
              {filtered.length > visible && <div className="load-more"><button className="outline-button" onClick={() => setVisible((v) => v + 9)}>Meet more dogs <ArrowRight size={17}/></button></div>}
              </>}
          </section>
        </>}

        {active === 'match' && <section className="inner-page">
          <div className="page-intro"><span className="eyebrow"><Sparkles size={16}/> PERSONALITY FIRST</span><h1>The companion matchmaker<span>.</span></h1><p>Your lifestyle, your rhythm, your kind of dog. Tell us a little about yourself and we'll highlight breeds with matching published traits.</p></div>
          <div className="match-layout">
            <div className="quiz-card">
              <div className="quiz-head"><span>YOUR LIFESTYLE</span><span>01 — 04</span></div>
              <div className="question"><h3>Where do you call home?</h3><p>Think about the space you'll share.</p><div className="choice-grid"><Choice label="🏙️ Apartment / flat" value="apartment" selected={preferences.space === 'apartment'} onClick={(v) => changePref('space', v)}/><Choice label="🏡 House with space" value="house" selected={preferences.space === 'house'} onClick={(v) => changePref('space', v)}/></div></div>
              <div className="question"><h3>What's your activity level?</h3><p>Every good dog day has its own pace.</p><div className="choice-grid three"><Choice label="🌿 Easygoing" value="low" selected={preferences.activity === 'low'} onClick={(v) => changePref('activity', v)}/><Choice label="🚶 Balanced" value="medium" selected={preferences.activity === 'medium'} onClick={(v) => changePref('activity', v)}/><Choice label="⚡ Adventurous" value="high" selected={preferences.activity === 'high'} onClick={(v) => changePref('activity', v)}/></div></div>
              <div className="question"><h3>Have you had a dog before?</h3><p>There's a first for everything.</p><div className="choice-grid"><Choice label="✨ First-time owner" value="first" selected={preferences.experience === 'first'} onClick={(v) => changePref('experience', v)}/><Choice label="🐾 Experienced" value="experienced" selected={preferences.experience === 'experienced'} onClick={(v) => changePref('experience', v)}/></div></div>
              <div className="question"><h3>Will children be around?</h3><p>Tell us about your crew.</p><div className="choice-grid"><Choice label="❤️ Yes, family friendly" value="yes" selected={preferences.family === 'yes'} onClick={(v) => changePref('family', v)}/><Choice label="🌱 Not currently" value="no" selected={preferences.family === 'no'} onClick={(v) => changePref('family', v)}/></div></div>
              <button className="primary-button full-button" onClick={() => setQuizDone(true)}>Show my top matches <ArrowRight size={18}/></button>
            </div>
            <div className="quiz-aside"><div className="quiz-aside-badge"><PawPrint size={28}/></div><h3>It's not about the perfect dog.</h3><p>It's about finding a wonderful companion you can love and care for, in a life that works for both of you.</p><div className="aside-emphasis">Made for real humans & real dogs <Heart size={17}/></div></div>
          </div>
          {quizDone && <section className="match-results"><SectionHeading eyebrow="YOUR MATCHES" title="Meet your kindred spirits." description="Ranked from available Dog API breed traits, not a prediction of individual temperament."/><div className="match-grid">{matches.slice(0, 6).map((b, i) => <article className="match-result" key={b.id}><div className="match-result-photo"><Photo breed={b}/><span className="match-place">#{i + 1}</span></div><div><span className="match-score">{b.matchScore}% trait alignment</span><h3>{b.name}</h3><p>{b.group} · {b.traitsAvailable} measured traits</p><button onClick={() => setSelected(b)}>Meet {b.name} <ArrowRight size={16}/></button></div></article>)}</div>{!matches.length && <div className="empty-state"><p>The API doesn't currently include enough measured traits for these matches.</p></div>}</section>}
        </section>}

        {active === 'saved' && <section className="inner-page"><div className="page-intro"><span className="eyebrow"><Heart size={16}/> YOUR LITTLE COLLECTION</span><h1>Dogs you adore<span>.</span></h1><p>A cosy home for the breeds that caught your eye. Your favourites stay saved in this browser.</p></div><BreedGrid breeds={savedBreeds} {...gridProps} emptyMessage="Tap the little heart on any breed to save it here."/>{savedBreeds.length === 0 && <button className="primary-button centred-action" onClick={() => setActive('discover')}>Explore the breeds <ArrowRight size={17}/></button>}</section>}

        {active === 'compare' && <section className="inner-page"><div className="page-intro"><span className="eyebrow"><Scale size={16}/> SIDE BY SIDE</span><h1>Better together<span>.</span></h1><p>Pick up to two breeds and see how their characteristics stack up. Compare facts, not fluff.</p></div>
          {comparison.length < 2 ? <div className="compare-empty"><div className="compare-illustration"><Scale size={60}/></div><h2>Two breeds, one easy comparison.</h2><p>{comparison.length ? comparison[0].name + ' is ready. Add one more breed from the library.' : 'Choose two dogs from the breed library to start comparing.'}</p><button className="primary-button" onClick={() => setActive('discover')}>Choose breeds <ArrowRight size={17}/></button></div> :
            <div className="comparison-card"><div className="comparison-photos"><div><Photo breed={comparison[0]}/><h2>{comparison[0].name}</h2><button onClick={() => compareBreed(comparison[0].id)}><X size={14}/> Remove</button></div><span>VS</span><div><Photo breed={comparison[1]}/><h2>{comparison[1].name}</h2><button onClick={() => compareBreed(comparison[1].id)}><X size={14}/> Remove</button></div></div>
            <div className="compare-table">{[
              ['Breed group', comparison[0].group, comparison[1].group],
              ['Origin', comparison[0].origin, comparison[1].origin],
              ['Lifespan', rangeLabel(comparison[0].life, ' years'), rangeLabel(comparison[1].life, ' years')],
              ['Male weight', rangeLabel(comparison[0].weight, ' kg'), rangeLabel(comparison[1].weight, ' kg')],
              ['Hypoallergenic', comparison[0].hypoallergenic ? 'Listed yes' : 'Not listed yes', comparison[1].hypoallergenic ? 'Listed yes' : 'Not listed yes'],
              ...personalityKeys.slice(0, 4).map(([key,label]) => [label, Number.isFinite(comparison[0].traits?.[key]) ? comparison[0].traits[key] + '/5' : 'Not listed', Number.isFinite(comparison[1].traits?.[key]) ? comparison[1].traits[key] + '/5' : 'Not listed'])
            ].map(([label, left, right]) => <div className="compare-row" key={label}><span>{label}</span><strong>{left}</strong><strong>{right}</strong></div>)}</div><p className="compare-footnote">Values are supplied by Dog API; they describe breeds in general and may not predict an individual dog's needs.</p></div>}
        </section>}

        {active === 'about' && <section className="inner-page"><div className="page-intro"><span className="eyebrow"><Info size={16}/> NICE TO MEET YOU</span><h1>Built with curiosity & care<span>.</span></h1><p>Pawly brings dog knowledge together in one friendly place — while showcasing how real-world APIs, quality gates, Docker and continuous deployment come together.</p></div>
          <div className="about-grid"><div className="about-hero"><span className="about-paw"><PawPrint size={39}/></span><h2>Big love for little paws.</h2><p>Browse documented breeds, explore real photos and discover what makes each companion special. No sign-up, no complicated dashboards — just a delightful place to start your search.</p><button className="primary-button" onClick={() => setActive('discover')}>Start exploring <ArrowRight size={16}/></button></div><div className="about-details">
            <div><Globe2 size={23}/><h3>Real Dog API</h3><p>Breed records, images, breed groups and facts come directly from <a href="https://dogapi.dog/docs/api-v2" target="_blank" rel="noopener noreferrer">dogapi.dog v2 <ExternalLink size={13}/></a>.</p></div>
            <div><Heart size={23}/><h3>Your own shortlist</h3><p>Favourites are saved locally on your device; no account or personal data collection is required.</p></div>
            <div><Github size={23}/><h3>Built with CI/CD</h3><p>Tests, GitHub Pages deployment and commit-versioned Docker images are automated by GitHub Actions.</p></div>
            <div><ShieldCheck size={23}/><h3>Thoughtful information</h3><p>Discovery scores are simple, explainable calculations, never a guarantee of suitability or medical advice.</p></div>
          </div></div>
        </section>}

        <footer className="site-footer"><div><PawPrint size={17}/><strong>pawly.</strong><span>Every breed has a story.</span></div><span>Built with <Heart size={13} fill="currentColor"/> and the <a href="https://dogapi.dog" target="_blank" rel="noopener noreferrer">Dog API <ExternalLink size={12}/></a></span></footer>
      </main>
    </div>
    {compared.length > 0 && active !== 'compare' && <div className="compare-toast"><span className="compare-toast-icon"><Scale size={19}/></span><span><strong>{compared.length} of 2 breeds</strong><small>Added to comparison</small></span><button onClick={() => setActive('compare')}>View comparison <ArrowRight size={15}/></button><button aria-label="Clear comparison" className="toast-close" onClick={() => setCompared([])}><X size={16}/></button></div>}
    {selected && <DetailModal breed={selected} onClose={() => setSelected(null)} isSaved={saved.includes(selected.id)} onSave={saveBreed} isCompared={compared.includes(selected.id)} onCompare={compareBreed}/>}
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
