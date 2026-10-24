import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Check,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleDot, Clock3,
  Cloud, Code2, Download, ExternalLink, Eye, Filter, Fingerprint,
  GitBranch, Github, LayoutDashboard, ListFilter, LockKeyhole, Menu,
  Play, Radar, RefreshCw, Search, Server, Shield, ShieldAlert,
  ShieldCheck, Sparkles, TrendingUp, Wallet, X, Zap, Database,
  AlertTriangle, CheckCircle, Gauge, CircleHelp, Workflow, SlidersHorizontal, PawPrint
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { STATIC_PAGES, getPipeline, getRules, getTransactions, evaluateTransaction, updateCase } from "./api";
import DogApiLab from "./DogApiLab";
import {
  categorySeries, dailySeries, decisionColors, decisions, downloadCSV,
  fullDate, money, number, pct, selectRange, shortDate, summarize, topSignals
} from "./analytics";
import type { Range } from "./analytics";
import type { CaseStatus, Decision, Evaluation, Page, PipelineResponse, RiskRule, TransactionPayload, TransactionRow } from "./types";

const REPO = "https://github.com/A101shah/CI-CD_Pipeline_IMAP";
const NAV = [
  { name:"Overview", page:"overview" as Page, icon:LayoutDashboard },
  { name:"Transactions", page:"transactions" as Page, icon:Wallet },
  { name:"Investigations", page:"investigations" as Page, icon:ShieldAlert },
  { name:"Risk engine", page:"risk-engine" as Page, icon:Radar },
  { name:"CI/CD monitor", page:"pipelines" as Page, icon:Workflow },
  { name:"Dog API Lab", page:"dog-api" as Page, icon:PawPrint },
];
const RANGE:Range[]=["24h","7d","30d"];
const allCategories=["All categories","groceries","electronics","travel","gift_cards","utilities","other"];
const tooltipStyle={background:"#141f35",border:"1px solid #2c3b56",borderRadius:12,color:"#f2f7ff",fontSize:12,boxShadow:"0 14px 50px #0005"};
const presetData:Record<string,TransactionPayload>={
  low:{transaction_id:"FG-DEMO-1001",amount_inr:2400,country:"IN",home_country:"IN",transactions_last_hour:1,device_is_new:false,distance_from_home_km:15,merchant_category:"groceries"},
  review:{transaction_id:"FG-DEMO-1002",amount_inr:64000,country:"IN",home_country:"IN",transactions_last_hour:1,device_is_new:false,distance_from_home_km:9,merchant_category:"gift_cards"},
  block:{transaction_id:"FG-DEMO-1003",amount_inr:92000,country:"AE",home_country:"IN",transactions_last_hour:7,device_is_new:true,distance_from_home_km:2500,merchant_category:"electronics"},
};
const label = (value:string) => value.replaceAll("_"," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const kind = (status:Decision|CaseStatus) => status.toLowerCase().replaceAll("_","-");
const localTime=(s:string)=>new Date(s).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
const initials=(s:string)=>s.split(" ").slice(0,2).map(a=>a.charAt(0)).join("").toUpperCase();
const checkedLink=(u:string)=>u.startsWith("https://github.com/A101shah/CI-CD_Pipeline_IMAP/")?u:REPO+"/actions";

function Tag({children,tone="neutral",dot=false}:{children:ReactNode;tone?:string;dot?:boolean}) {
  return <span className={"tag tag-"+tone}>{dot&&<span className="tag-dot"/>}{children}</span>;
}
function Pill({decision}:{decision:Decision}) {
  return <span className={"decision-pill decision-"+kind(decision)}><span className="tag-dot"/>{decision==="APPROVE"?"Approved":decision==="REVIEW"?"Review":"Blocked"}</span>;
}
function PageTitle({eyebrow,title,description,actions}:{eyebrow:string;title:string;description:string;actions?:ReactNode}) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions&&<div className="page-actions">{actions}</div>}</div>;
}
function Frame({title,description,action,children,className=""}:{title:string;description?:string;action?:ReactNode;children:ReactNode;className?:string}) {
  return <section className={"panel "+className}><div className="panel-top"><div><h3>{title}</h3>{description&&<p>{description}</p>}</div>{action}</div>{children}</section>;
}
function Empty({title,description}:{title:string;description?:string}) {
  return <div className="empty"><Search size={25}/><b>{title}</b><span>{description}</span></div>;
}
function Metric({labelText,value,change,icon:Icon,tone,sub}:{labelText:string;value:string;change:string;icon:typeof Activity;tone:string;sub:string}) {
  return <div className="metric-card"><div className="metric-head"><span>{labelText}</span><span className={"metric-icon "+tone}><Icon size={18}/></span></div>
    <div className="metric-value">{value}</div><div className="metric-foot"><span className={"metric-delta "+tone}><ArrowUpRight size={13}/>{change}</span><span>{sub}</span></div></div>;
}
function RiskMeter({value}:{value:number}) {
  return <div className="risk-meter"><div className="risk-meter-fill" style={{width:value+"%",background:value>=70?decisionColors.BLOCK:value>=40?decisionColors.REVIEW:decisionColors.APPROVE}}/></div>;
}
function TransactionTable({rows,onSelect,compact=false}:{rows:TransactionRow[];onSelect:(r:TransactionRow)=>void;compact?:boolean}) {
  return <div className="table-scroll"><table className="data-table"><thead><tr>
  <th>Transaction / merchant</th><th>Amount</th><th>Risk score</th><th>Decision</th>{!compact&&<th>Time</th>}<th></th>
  </tr></thead><tbody>{rows.map(row=><tr key={row.id} onClick={()=>onSelect(row)} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")onSelect(row);}}>
    <td><div className="merchant-cell"><div className={"merchant-logo "+row.category}>{initials(row.merchant)}</div><div><strong>{row.merchant}</strong><span>{row.id} · {label(row.category)}</span></div></div></td>
    <td className="amount">{money(row.amount)}</td>
    <td><div className="risk-cell"><span style={{color:row.risk_score>=70?decisionColors.BLOCK:row.risk_score>=40?decisionColors.REVIEW:decisionColors.APPROVE}}>{row.risk_score}</span><RiskMeter value={row.risk_score}/></div></td>
    <td><Pill decision={row.decision}/></td>
    {!compact&&<td className="muted-cell">{fullDate(row.timestamp)}</td>}<td><ChevronRight size={17}/></td>
  </tr>)}</tbody></table>{rows.length===0&&<Empty title="No matching transactions" description="Try a different filter or a longer date range."/>}</div>;
}
function Segmented({value,onChange}:{value:Range;onChange:(v:Range)=>void}) {
  return <div className="segmented">{RANGE.map(r=><button key={r} className={value===r?"active":""} onClick={()=>onChange(r)}>{r}</button>)}</div>;
}
function App() {
  const [page,setPage]=useState<Page>("overview");
  const [range,setRange]=useState<Range>("30d");
  const [data,setData]=useState<TransactionRow[]>([]);
  const [rules,setRules]=useState<RiskRule[]>([]);
  const [pipeline,setPipeline]=useState<PipelineResponse|null>(null);
  const [loading,setLoading]=useState(true);
  const [loadingPipeline,setLoadingPipeline]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [search,setSearch]=useState("");
  const [decisionFilter,setDecisionFilter]=useState("ALL");
  const [categoryFilter,setCategoryFilter]=useState("All categories");
  const [tablePage,setTablePage]=useState(1);
  const [selected,setSelected]=useState<TransactionRow|null>(null);
  const [caseFilter,setCaseFilter]=useState("ALL");
  const [caseWorking,setCaseWorking]=useState(false);
  const [payload,setPayload]=useState<TransactionPayload>({...presetData.low});
  const [result,setResult]=useState<Evaluation|null>(null);
  const [evaluating,setEvaluating]=useState(false);
  const [riskError,setRiskError]=useState("");
  const [refreshing,setRefreshing]=useState(false);

  const fetchData=async()=>{
    const [a,b,c]=await Promise.allSettled([getTransactions(),getRules(),getPipeline()]);
    if(a.status==="fulfilled"){setData(a.value);setError("");}
    else setError("The transaction API is unavailable. Check the FastAPI service and try again.");
    if(b.status==="fulfilled")setRules(b.value);
    if(c.status==="fulfilled")setPipeline(c.value);
    else setPipeline({source:"unavailable",repository:"A101shah/CI-CD_Pipeline_IMAP",runs:[],message:"CI/CD information is unavailable."});
    setLoading(false);
  };
  useEffect(()=>{void fetchData();},[]);
  const refresh=async()=>{setRefreshing(true);await fetchData();setRefreshing(false);setNotice("Dashboard data refreshed.");};
  const filtered=useMemo(()=>selectRange(data,range),[data,range]);
  const summary=useMemo(()=>summarize(filtered),[filtered]);
  const trend=useMemo(()=>dailySeries(filtered),[filtered]);
  const split=useMemo(()=>decisions(filtered),[filtered]);
  const categories=useMemo(()=>categorySeries(filtered),[filtered]);
  const signals=useMemo(()=>topSignals(filtered),[filtered]);
  const searched=useMemo(()=>filtered.filter(r=>{
    const q=search.toLowerCase();
    return (!q||[r.id,r.merchant,r.category,r.country].some(v=>v.toLowerCase().includes(q)))
      &&(decisionFilter==="ALL"||r.decision===decisionFilter)
      &&(categoryFilter==="All categories"||r.category===categoryFilter);
  }),[filtered,search,decisionFilter,categoryFilter]);
  const pageCount=Math.max(1,Math.ceil(searched.length/10));
  const pageRows=searched.slice((Math.min(tablePage,pageCount)-1)*10,Math.min(tablePage,pageCount)*10);
  const cases=useMemo(()=>data.filter(r=>r.decision!=="APPROVE"&&(caseFilter==="ALL"||r.case_status===caseFilter)),[data,caseFilter]);
  const openCases=data.filter(r=>r.decision!=="APPROVE"&&r.case_status!=="RESOLVED").length;
  const go=(to:Page)=>{setPage(to);setMobileOpen(false);window.scrollTo({top:0,behavior:"smooth"});};
  const doCase=async(status:"OPEN"|"INVESTIGATING"|"RESOLVED")=>{
    if(!selected)return;
    setCaseWorking(true);
    try {const updated=await updateCase(selected.id,status);setData(old=>old.map(r=>r.id===updated.id?updated:r));setSelected(updated);setNotice(STATIC_PAGES?"Case status saved locally in this browser.":"Case status updated for this server session.");}
    catch(e){setNotice(e instanceof Error?e.message:"Unable to update case");}
    finally{setCaseWorking(false);}
  };
  const submit=async(e:FormEvent)=>{
    e.preventDefault();setEvaluating(true);setRiskError("");setResult(null);
    try {
      const evaluation=await evaluateTransaction(payload);setResult(evaluation);
      const latest=await getTransactions();setData(latest);setNotice(STATIC_PAGES?"Simulated transaction saved locally in this browser.":"Synthetic transaction evaluated and added to this session.");
    } catch(e){
      const message=e instanceof Error?e.message:"Transaction evaluation failed";
      setRiskError(message);
      setNotice("Risk simulation could not complete — see the form for details.");
    }
    finally{setEvaluating(false);}
  };
  const refreshPipeline=async()=>{
    setLoadingPipeline(true);
    try{setPipeline(await getPipeline());}
    catch{setPipeline({source:"unavailable",repository:"A101shah/CI-CD_Pipeline_IMAP",runs:[],message:"Unable to fetch pipeline status."});}
    finally{setLoadingPipeline(false);}
  };
  const setField=(name:keyof TransactionPayload,value:string|number|boolean)=>setPayload(s=>({...s,[name]:value}));
  const latestRun=pipeline?.runs[0];

  return <div className="app-shell">
    <aside className={"sidebar "+(mobileOpen?"sidebar-open":"")}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={23} strokeWidth={2.4}/></div><div>Fraud<span>Gate</span><small>INTELLIGENCE PLATFORM</small></div><button className="mobile-close icon-btn" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"><X size={19}/></button></div>
      <div className="workspace-switch"><span className="workspace-avatar"><Fingerprint size={20}/></span><div><b>Fraud Intelligence</b><small>Demo workspace</small></div><ChevronDown size={16}/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{NAV.map(n=>{const Icon=n.icon;return <button key={n.page} className={"nav-link "+(page===n.page?"nav-active":"")} onClick={()=>go(n.page)}><Icon size={19} strokeWidth={1.9}/><span>{n.name}</span>{n.page==="investigations"&&openCases>0&&<em>{openCases}</em>}</button>;})}</nav>
      <div className="nav-caption nav-caption-secondary">QUICK ACCESS</div>
      <a className="nav-link sidebar-anchor" href={REPO} target="_blank" rel="noreferrer"><Github size={19}/> GitHub repository <ExternalLink size={13}/></a>
      <a className="nav-link sidebar-anchor" href={STATIC_PAGES?REPO+"/blob/main/README.md":"/docs"} target="_blank" rel="noreferrer"><Code2 size={19}/> {STATIC_PAGES?"Project documentation":"API documentation"} <ExternalLink size={13}/></a>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Sparkles size={19}/></div><b>Built to demonstrate trust.</b><p>Explainable fraud scoring meets automated delivery quality gates.</p><button onClick={()=>go("pipelines")}>Explore pipeline <ArrowRight size={15}/></button></div>
        <div className="profile"><div className="profile-avatar">FG</div><div><strong>FraudGate Demo</strong><small>Educational environment</small></div><Tag tone="green" dot>Active</Tag></div>
      </div>
    </aside>
    {mobileOpen&&<button className="sidebar-overlay" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
    <div className="app-main">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn menu-toggle" aria-label="Open menu" onClick={()=>setMobileOpen(true)}><Menu size={22}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={15}/><b>{NAV.find(n=>n.page===page)?.name}</b></div></div>
        <div className="topbar-right"><span className="topbar-divider"></span><Tag tone={STATIC_PAGES?"violet":"green"} dot>{STATIC_PAGES?"Pages demo":"Demo system"}</Tag><button className="top-icon" aria-label="Refresh data" title="Refresh data" onClick={()=>void refresh()} disabled={refreshing}><RefreshCw size={17} className={refreshing?"spin":""}/></button><div className="top-avatar">FG</div></div>
      </header>
      <div className="content">
        {STATIC_PAGES&&<div className="pages-notice"><ShieldCheck size={17}/><span><strong>GitHub Pages demo:</strong> Risk scoring runs in your browser, simulated case updates are stored on this device, and public Dog API and GitHub Actions data are fetched live.</span></div>}
        <div className="data-ribbon"><span className="ribbon-icon"><Database size={14}/></span><strong>SIMULATED ENVIRONMENT</strong><span>All transactions are synthetic. Case updates and new evaluations are stored in this server process only.</span><CircleHelp size={15}/></div>
        {notice&&<div className="notice"><CheckCircle2 size={16}/>{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss notice"><X size={15}/></button></div>}
        {error&&<div className="error-banner"><AlertTriangle size={18}/>{error}<button onClick={()=>void refresh()}>Retry</button></div>}
        {loading?<div className="loading-state"><div className="loading-ring"/><h2>Loading intelligence workspace</h2><p>Preparing synthetic transactions and pipeline data…</p></div>:null}
        {!loading&&page==="overview"&&<>
          <PageTitle eyebrow="COMMAND CENTER / OVERVIEW" title="Fraud Intelligence Overview" description="A unified view of transaction activity, risk exposure, and your team's decision queue."
            actions={<><Segmented value={range} onChange={setRange}/><button className="primary-btn" onClick={()=>go("risk-engine")}><Play size={16} fill="currentColor"/> Run simulation</button></>}/>
          <div className="overview-status"><div><span className="live-pulse"/><b>System operational</b><span>Rules engine active</span></div><span className="overview-status-right"><Shield size={15}/> Explainable assessments · {number(summary.total)} transactions in view</span></div>
          <div className="metrics">
            <Metric labelText="Transactions analyzed" value={number(summary.total)} change="100%" icon={Wallet} tone="mint" sub="of selected period"/>
            <Metric labelText="Flagged for attention" value={number(summary.flagged)} change={pct(summary.flagRate)} icon={ShieldAlert} tone="amber" sub="of evaluated transactions"/>
            <Metric labelText="Approval rate" value={pct(summary.approvalRate)} change={number(summary.approved)} icon={CheckCircle2} tone="mint" sub="transactions approved"/>
            <Metric labelText="Transaction volume" value={money(summary.volume)} change={pct(summary.average)} icon={Activity} tone="violet" sub="average risk score"/>
          </div>
          <div className="analytics-grid">
            <Frame className="trend-panel" title="Transaction activity" description="Risk distribution and throughput over time" action={<Tag tone="neutral">SYNTHETIC DATA</Tag>}>
              <div className="chart-legend"><span><i className="legend-dot" style={{background:"#54deb5"}}/>Approved</span><span><i className="legend-dot" style={{background:"#f5bb70"}}/>Flagged</span></div>
              <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:10,right:6,bottom:0,left:-26}}>
                <defs><linearGradient id="areaApproved" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#54deb5" stopOpacity={.27}/><stop offset="100%" stopColor="#54deb5" stopOpacity={.01}/></linearGradient><linearGradient id="areaFlagged" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5bb70" stopOpacity={.21}/><stop offset="100%" stopColor="#f5bb70" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke="#273349" vertical={false} strokeDasharray="3 6"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:"#8290a9",fontSize:10}} minTickGap={23}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#8290a9",fontSize:11}} allowDecimals={false}/>
                <Tooltip contentStyle={tooltipStyle}/><Area type="monotone" dataKey="approved" stroke="#54deb5" name="Approved" strokeWidth={2.6} fill="url(#areaApproved)" dot={false}/><Area type="monotone" dataKey="flagged" stroke="#f5bb70" name="Flagged" strokeWidth={2.2} fill="url(#areaFlagged)" dot={false}/>
              </AreaChart></ResponsiveContainer></div>
            </Frame>
            <Frame title="Decision breakdown" description="Classification of evaluated activity" className="distribution-panel">
              <div className="donut-box"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={split} dataKey="value" innerRadius={76} outerRadius={99} paddingAngle={3} strokeWidth={0} startAngle={90} endAngle={-270}>{split.map(x=><Cell key={x.name} fill={x.color}/>)}</Pie><Tooltip contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer>
                <div className="donut-core"><b>{number(summary.total)}</b><span>Total</span></div></div>
              <div className="donut-legend">{split.map((x,i)=><div key={x.name}><span><i className="legend-dot" style={{background:x.color}}/>{x.name}</span><b>{x.value} <small>({pct(summary.total?x.value/summary.total*100:0)})</small></b></div>)}</div>
            </Frame>
          </div>
          <div className="analytics-grid below-grid">
            <Frame title="Merchant category exposure" description="Category-level transaction distribution"><div className="bar-area"><ResponsiveContainer height="100%" width="100%"><BarChart layout="vertical" data={categories} margin={{left:-16,right:7,top:8,bottom:0}}>
              <CartesianGrid stroke="#273349" strokeDasharray="3 6" horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false} tick={{fill:"#8290a9",fontSize:11}}/><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={90} tick={{fill:"#acb9ce",fontSize:11}}/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey="total" name="Transactions" fill="#6474f8" radius={[0,5,5,0]} barSize={14}/><Bar dataKey="flagged" name="Flagged" fill="#f5bb70" radius={[0,5,5,0]} barSize={8}/></BarChart></ResponsiveContainer></div></Frame>
            <Frame title="Top risk indicators" description="Signals most often responsible for elevated scores" action={<button className="link-btn" onClick={()=>go("risk-engine")}>View rules <ArrowRight size={14}/></button>}>
              <div className="risk-signals">{signals.slice(0,5).map((s,i)=><div className="signal-row" key={s.code}><span className="signal-rank">{String(i+1).padStart(2,"0")}</span><div className="signal-detail"><div><b>{label(s.label)}</b><span>{number(s.count)} triggers</span></div><div className="signal-track"><i style={{width:(signals[0]?s.count/signals[0].count*100:0)+"%"}}/></div></div></div>)}{signals.length===0&&<Empty title="No signals in this period"/>}</div>
            </Frame>
          </div>
          <Frame title="Recent transactions" description="Select a transaction to inspect the rule-level assessment" action={<button className="link-btn" onClick={()=>go("transactions")}>View all transactions <ArrowRight size={15}/></button>}>
            <TransactionTable rows={filtered.slice(0,6)} onSelect={setSelected} compact/>
          </Frame>
        </>}
        {!loading&&page==="transactions"&&<>
          <PageTitle eyebrow="OPERATIONS / TRANSACTIONS" title="Transaction Explorer" description="Search, investigate, and export the synthetic evaluation activity."
            actions={<><Segmented value={range} onChange={v=>{setRange(v);setTablePage(1);}}/><button className="outline-btn" onClick={()=>downloadCSV(searched)}><Download size={16}/> Export CSV</button></>}/>
          <div className="minor-stats"><div><span>Total in view</span><b>{number(summary.total)}</b></div><div><span>Approved</span><b className="text-mint">{number(summary.approved)}</b></div><div><span>Under review</span><b className="text-amber">{number(summary.review)}</b></div><div><span>Blocked</span><b className="text-red">{number(summary.blocked)}</b></div></div>
          <Frame title="Transaction ledger" description="Select a record to inspect its full risk explanation" action={<Tag tone="neutral">{number(searched.length)} RESULTS</Tag>}>
            <div className="filters"><label className="search-wrap"><Search size={17}/><input aria-label="Search transactions" value={search} onChange={e=>{setSearch(e.target.value);setTablePage(1);}} placeholder="Search ID, merchant, country..."/></label>
              <label className="select-wrap"><Filter size={15}/><select aria-label="Filter by decision" value={decisionFilter} onChange={e=>{setDecisionFilter(e.target.value);setTablePage(1);}}><option value="ALL">All decisions</option><option value="APPROVE">Approved</option><option value="REVIEW">Review</option><option value="BLOCK">Blocked</option></select></label>
              <label className="select-wrap"><ListFilter size={15}/><select aria-label="Filter by category" value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setTablePage(1);}}>{allCategories.map(c=><option value={c} key={c}>{label(c)}</option>)}</select></label>
            </div><TransactionTable rows={pageRows} onSelect={setSelected}/>
            <div className="pagination"><span>Showing {searched.length?(Math.min(tablePage,pageCount)-1)*10+1:0}–{Math.min(Math.min(tablePage,pageCount)*10,searched.length)} of {number(searched.length)} transactions</span><div><button aria-label="Previous page" disabled={tablePage<=1} onClick={()=>setTablePage(v=>Math.max(1,v-1))}><ChevronLeft size={17}/></button><span>{Math.min(tablePage,pageCount)} / {pageCount}</span><button aria-label="Next page" disabled={tablePage>=pageCount} onClick={()=>setTablePage(v=>Math.min(pageCount,v+1))}><ChevronRight size={17}/></button></div></div>
          </Frame>
        </>}
        {!loading&&page==="investigations"&&<>
          <PageTitle eyebrow="OPERATIONS / INVESTIGATIONS" title="Investigation Queue" description="Prioritize elevated-risk transactions, inspect decisions, and update temporary case states." actions={<button className="outline-btn" onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh queue</button>}/>
          <div className="minor-stats"><div><span>Cases requiring review</span><b>{number(data.filter(r=>r.decision!=="APPROVE").length)}</b></div><div><span>Open</span><b className="text-red">{number(data.filter(r=>r.case_status==="OPEN").length)}</b></div><div><span>Investigating</span><b className="text-amber">{number(data.filter(r=>r.case_status==="INVESTIGATING").length)}</b></div><div><span>Resolved</span><b className="text-mint">{number(data.filter(r=>r.case_status==="RESOLVED").length)}</b></div></div>
          <Frame title="Case management" description="Decisions and case updates are simulated, not live bank operations" action={<div className="segmented filters-segment">{["ALL","OPEN","INVESTIGATING","RESOLVED"].map(s=><button key={s} className={caseFilter===s?"active":""} onClick={()=>setCaseFilter(s)}>{s==="ALL"?"All":label(s)}</button>)}</div>}>
            <div className="case-list">{cases.slice(0,70).map(r=><button key={r.id} className="case-item" onClick={()=>setSelected(r)}>
              <div className={"case-icon "+(r.decision==="BLOCK"?"critical":"medium")}><ShieldAlert size={18}/></div><div className="case-primary"><strong>{r.merchant}</strong><span>{r.id} · {shortDate(r.timestamp)}</span></div>
              <div className="case-tags"><Pill decision={r.decision}/><Tag tone={r.case_status==="RESOLVED"?"green":r.case_status==="INVESTIGATING"?"amber":"neutral"}>{label(r.case_status)}</Tag></div>
              <div className="case-score">{r.risk_score}<small>/100</small></div><ChevronRight size={18} className="case-chevron"/></button>)}
              {cases.length>70&&<div className="more-hint">Showing the 70 most recent cases. Change filters to narrow your investigation view.</div>}
              {cases.length===0&&<Empty title="No cases in this status" description="Choose another status to see investigations."/>}
            </div></Frame>
        </>}
        {!loading&&page==="risk-engine"&&<>
          <PageTitle eyebrow="INTELLIGENCE / RISK ENGINE" title="Risk Decision Lab" description="Test the decision engine with synthetic scenarios and inspect exactly which rules fired." actions={error?<Tag tone="red">API unavailable</Tag>:<Tag tone="green" dot>Rules engine active</Tag>}/>
          <div className="lab-grid">
            <Frame title="Transaction sandbox" description="No actual financial transactions are processed">
              <div className="form-pad"><div className="preset-row"><span>QUICK SCENARIOS</span><div>{[["low","Safe purchase"],["review","Needs review"],["block","High risk"]].map(([k,v])=><button key={k} className={"preset "+(JSON.stringify(payload)===JSON.stringify(presetData[k])?"selected":"")} onClick={()=>{setPayload({...presetData[k]});setResult(null);setRiskError("");}}>{v}</button>)}</div></div>
              <form onSubmit={submit}><div className="form-grid">
                <label>Transaction ID<input value={payload.transaction_id} maxLength={64} required onChange={e=>setField("transaction_id",e.target.value)}/></label>
                <label>Amount (INR)<input type="number" min=".01" step=".01" required value={payload.amount_inr} onChange={e=>setField("amount_inr",Number(e.target.value))}/></label>
                <label>Transaction country<select value={payload.country} onChange={e=>setField("country",e.target.value)}>{["IN","US","GB","AE","SG","FR"].map(x=><option key={x}>{x}</option>)}</select></label>
                <label>Home country<select value={payload.home_country} onChange={e=>setField("home_country",e.target.value)}>{["IN","US","GB","AE","SG","FR"].map(x=><option key={x}>{x}</option>)}</select></label>
                <label>Transactions last hour<input type="number" min="0" max="100000" required value={payload.transactions_last_hour} onChange={e=>setField("transactions_last_hour",Number(e.target.value))}/></label>
                <label>Distance from home (km)<input type="number" min="0" max="40075" step="any" required value={payload.distance_from_home_km} onChange={e=>setField("distance_from_home_km",Number(e.target.value))}/></label>
                <label>Merchant category<select value={payload.merchant_category} onChange={e=>setField("merchant_category",e.target.value)}>{allCategories.slice(1).map(x=><option value={x} key={x}>{label(x)}</option>)}</select></label>
                <label className="checkbox-field"><span>Device verification</span><span className="checkbox-row"><input type="checkbox" checked={payload.device_is_new} onChange={e=>setField("device_is_new",e.target.checked)}/> Unrecognized device</span></label>
              </div><button className="primary-btn submit-btn" disabled={evaluating} type="submit"><Zap size={17}/>{evaluating?"Evaluating transaction…":"Evaluate risk profile"}<ArrowRight size={17}/></button>{riskError&&<div className="risk-form-error" role="alert"><AlertTriangle size={17}/><span>{riskError}</span><button type="button" onClick={()=>setRiskError("")} aria-label="Dismiss error"><X size={15}/></button></div>}</form></div>
            </Frame>
            <Frame title="Decision result" description="Deterministic score · transparent evidence">
              <div className="score-card"><div className={"score-circle "+(result?kind(result.decision):"waiting")} style={{["--score" as string]:(result?.score??0)+"%"}}><div><b>{result?.score??"—"}</b><span>/ 100</span></div></div>
                <div className="result-status">{result?<Pill decision={result.decision}/>:<Tag tone="neutral">Awaiting assessment</Tag>}</div>
                <p>{result?.explanation??"Select a scenario, adjust the inputs, and evaluate to see the risk score and evidence."}</p></div>
              <div className="result-evidence"><div className="section-mini"><span>TRIGGERED RULES</span><b>{result?.triggered_rules.length??0} active</b></div>
                {result?.triggered_rules.map(r=><div className="evidence-row" key={r.code}><div><AlertTriangle size={15}/><span>{label(r.code)}</span></div><b>+{r.points} pts</b></div>)}
                {result&&result.triggered_rules.length===0&&<div className="success-state"><CheckCircle2 size={19}/> No indicators triggered</div>}
                {!result&&<div className="empty-evidence">Rule-level results appear after evaluation.</div>}
              </div>
            </Frame>
          </div>
          <Frame title="Rule configuration reference" description="Educational constants applied by the backend (read-only)">
            <div className="rules-grid">{rules.map((r,i)=><div className="rule-card" key={r.code}><div className="rule-number">RULE {String(i+1).padStart(2,"0")}</div><b>{label(r.code)}</b><p>{r.description}</p><div><Tag tone="violet">+{r.points} POINTS</Tag><ShieldCheck size={17}/></div></div>)}</div>
          </Frame>
        </>}
        {page==="dog-api"&&<DogApiLab/>}
        {!loading&&page==="pipelines"&&<>
          <PageTitle eyebrow="DEVOPS / DELIVERY INTELLIGENCE" title="CI/CD Operations Center" description="Observe the real GitHub Actions pipeline, quality gates, and Docker validation."
            actions={<><button className="outline-btn" onClick={()=>void refreshPipeline()} disabled={loadingPipeline}><RefreshCw size={16} className={loadingPipeline?"spin":""}/> Refresh status</button><a className="primary-btn" href={REPO+"/actions"} target="_blank" rel="noreferrer">Open GitHub Actions <ExternalLink size={15}/></a></>}/>
          <div className="pipeline-hero"><div><div className="eyebrow">PIPELINE HEALTH</div><h2>{pipeline?.source==="github"&&latestRun?(latestRun.conclusion==="success"?"All checks passing":latestRun.status==="completed"?"Latest workflow: "+label(latestRun.conclusion??"Unknown"):"Workflow "+label(latestRun.status)):"GitHub connection unavailable"}</h2><p>{pipeline?.source==="github"?"Live information from the public GitHub Actions API. GitHub may cache some results.":"Showing the pipeline architecture locally; fetch current details from the Actions tab."}</p><div className="pipeline-pill"><span className="live-pulse"/> GitHub Actions · {pipeline?.source==="github"?"CONNECTED":"UNAVAILABLE"}</div></div><div className="pipeline-illustration"><div><Github size={32}/></div><span/><div><CheckCircle2 size={32}/></div><span/><div><Cloud size={32}/></div></div></div>
          <div className="pipeline-stats"><div><span><GitBranch size={16}/> Repository</span><b>CI-CD_Pipeline_IMAP</b><small>main branch</small></div><div><span><CheckCircle2 size={16}/> Latest conclusion</span><b>{latestRun?label(latestRun.conclusion??latestRun.status):"Unavailable"}</b><small>{latestRun?.commit??"No verified run"}</small></div><div><span><Workflow size={16}/> Recent workflow runs</span><b>{pipeline?.runs.length??0}</b><small>Up to 12 recent runs</small></div></div>
          <Frame title="Automated delivery pipeline" description="Builds only after both independent quality gates pass" action={<Tag tone="violet">CONTINUOUS INTEGRATION</Tag>}>
            <div className="pipeline-flow"><div className="pipeline-step"><div className="step-icon"><Github size={24}/></div><b>Code push</b><span>GitHub repository</span></div><ArrowRight className="flow-arrow" size={20}/><div className="pipeline-step"><div className="step-icon"><Code2 size={24}/></div><b>Python tests</b><span>Pytest + ≥90% coverage</span></div><ArrowRight className="flow-arrow" size={20}/><div className="pipeline-step"><div className="step-icon"><BarChart3 size={24}/></div><b>Frontend gate</b><span>Vitest + Vite build</span></div><ArrowRight className="flow-arrow" size={20}/><div className="pipeline-step final"><div className="step-icon"><Server size={24}/></div><b>Docker image</b><span>Build + health smoke test</span></div></div>
            <div className="pipeline-note"><LockKeyhole size={17}/><span>No credentials or secrets required for this build. The image is built and checked, but not published or deployed by GitHub Actions.</span></div>
          </Frame>
          <Frame title="Latest GitHub Actions runs" description="Public read-only repository status" action={<Tag tone={pipeline?.source==="github"?"green":"amber"} dot>{pipeline?.source==="github"?"LIVE SOURCE":"OFFLINE"}</Tag>}>
            {pipeline?.source!=="github"?<div className="pipeline-unavailable"><AlertTriangle size={19}/>{pipeline?.message??"GitHub status is currently unavailable."}<a href={REPO+"/actions"} target="_blank" rel="noreferrer">View on GitHub <ExternalLink size={14}/></a></div>:<div className="run-list">{pipeline.runs.map(r=><a key={r.id} className="run-row" href={checkedLink(r.url)} target="_blank" rel="noreferrer">
              <div className={"run-icon "+(r.conclusion==="success"?"success":r.conclusion==="failure"?"failure":"pending")}>{r.conclusion==="success"?<Check size={18}/>:r.conclusion==="failure"?<X size={18}/>:<Clock3 size={18}/>}</div><div className="run-description"><b>{r.title}</b><span>{r.branch} · {r.event} · {r.commit}</span></div><span className="run-time">{fullDate(r.created_at)}</span><Tag tone={r.conclusion==="success"?"green":r.conclusion==="failure"?"red":"amber"}>{label(r.conclusion??r.status)}</Tag><ExternalLink size={16}/>
            </a>)}{pipeline.runs.length===0&&<Empty title="No runs returned"/>}</div>}
          </Frame>
        </>}
        <footer><span>© FraudGate 2.0 · Risk Intelligence Console</span><span>{STATIC_PAGES?"Browser-powered GitHub Pages demo":"Academic demonstration"} · No real payment processing</span></footer>
      </div>
    </div>
    {selected&&<div className="drawer-backdrop" role="presentation" onClick={()=>setSelected(null)}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-label="Transaction detail" onClick={e=>e.stopPropagation()}>
        <div className="drawer-top"><div><span className="eyebrow">TRANSACTION INTELLIGENCE</span><h2>Assessment details</h2></div><button className="icon-btn" onClick={()=>setSelected(null)} aria-label="Close details"><X size={20}/></button></div>
        <div className="drawer-content"><div className="drawer-summary"><div className={"drawer-merchant "+selected.category}>{initials(selected.merchant)}</div><h2>{selected.merchant}</h2><span>{selected.id}</span><strong>{money(selected.amount,2)}</strong><Pill decision={selected.decision}/></div>
        <div className="drawer-score"><div><span>COMPOSITE RISK SCORE</span><b>{selected.risk_score}<small>/100</small></b></div><RiskMeter value={selected.risk_score}/></div>
        <div className="drawer-section"><h3>Transaction metadata</h3>{[["Timestamp",fullDate(selected.timestamp)],["Merchant category",label(selected.category)],["Country",selected.country],["Device",selected.device_is_new?"Unrecognized":"Known"],["Transactions / hour",String(selected.transactions_last_hour)],["Distance from home",number(selected.distance_from_home_km)+" km"],["Data source",label(selected.source)]].map(([k,v])=><div className="data-pair" key={k}><span>{k}</span><b>{v}</b></div>)}</div>
        <div className="drawer-section"><h3>Triggered risk indicators</h3>{selected.reasons.length?selected.reasons.map(r=><div className="drawer-rule" key={r.code}><div><b>{label(r.code)}</b><small>{r.reason}</small></div><strong>+{r.points}</strong></div>):<div className="success-state"><CheckCircle2 size={18}/> No indicators triggered</div>}</div>
        {selected.decision!=="APPROVE"&&<div className="drawer-section"><h3>Investigation status</h3><p className="drawer-help">{STATIC_PAGES?"Changes stay in this browser on this device.":"Changes persist only during this server process."}</p><div className="case-buttons">{(["OPEN","INVESTIGATING","RESOLVED"] as const).map(s=><button key={s} disabled={caseWorking} className={selected.case_status===s?"selected":""} onClick={()=>void doCase(s)}>{label(s)}</button>)}</div></div>}
        </div>
        <div className="drawer-footer"><button className="outline-btn" onClick={()=>setSelected(null)}>Close assessment</button></div>
      </aside>
    </div>}
  </div>;
}
export default App;
