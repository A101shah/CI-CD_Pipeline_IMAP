/**
 * GitHub Pages adapter: the static host cannot run Python/FastAPI.
 * Replicates the six documented demonstration rules in the browser,
 * persists only demo cases in localStorage, and fetches public APIs directly.
 * This is educational simulation, not a security or financial service.
 */
import type {
  CaseStatus, DogBreed, DogBreedsResponse, DogFactsResponse, Evaluation,
  PipelineResponse, RiskRule, RuleHit, TransactionPayload, TransactionRow,
} from "./types";

const STORAGE = "fraudgate-pages-demo-v1";
const REPO = "A101shah/CI-CD_Pipeline_IMAP";
const DOG_BASE = "https://dogapi.dog/api/v2";
const MAX_ROWS = 700;
type LocalState = { evaluations: TransactionRow[]; statuses: Record<string,CaseStatus> };

export const RISK_RULES: RiskRule[] = [
  { code:"HIGH_AMOUNT", description:"Transaction is at least ₹50,000", points:30 },
  { code:"HIGH_VELOCITY", description:"At least five transactions in the past hour", points:25 },
  { code:"NEW_DEVICE", description:"Transaction originates from an unfamiliar device", points:15 },
  { code:"CROSS_BORDER", description:"Transaction country differs from home country", points:15 },
  { code:"FAR_FROM_HOME", description:"Distance from home is at least 1,000 km", points:15 },
  { code:"GIFT_CARD", description:"Purchase is in the gift-card category", points:10 },
];

export function evaluateRules(t: TransactionPayload): Evaluation {
  const checks = [
    t.amount_inr >= 50000,
    t.transactions_last_hour >= 5,
    t.device_is_new,
    t.country !== t.home_country,
    t.distance_from_home_km >= 1000,
    t.merchant_category === "gift_cards",
  ];
  const triggered_rules: RuleHit[] = RISK_RULES
    .filter((_, i) => checks[i])
    .map(r => ({
      code:r.code,
      reason:r.description,
      points:r.points,
    }));
  const score = Math.min(triggered_rules.reduce((sum,r)=>sum+r.points,0),100);
  const decision = score >= 70 ? "BLOCK" : score >= 40 ? "REVIEW" : "APPROVE";
  const explanation = {
    APPROVE:"Low rule-based risk: no manual review required by this demo.",
    REVIEW:"Moderate rule-based risk: refer to an analyst for review.",
    BLOCK:"High rule-based risk: hold this simulated transaction for investigation.",
  }[decision];
  return {transaction_id:t.transaction_id,score,decision,triggered_rules,explanation};
}

const CATEGORIES = ["groceries","electronics","travel","gift_cards","utilities","other"];
const MERCHANTS: Record<string,string[]> = {
  groceries:["FreshCart Market","Urban Basket","Daily Harvest"],
  electronics:["TechSquare","Gadget Central","Circuit Store"],
  travel:["Skyline Travel","Voyage Desk","Metro Tickets"],
  gift_cards:["Digital Gift Vault","Gift Exchange"],
  utilities:["City Power","Metro Utilities"],
  other:["Northstar Retail","Local Services"],
};
function seededRandom(seed=20261022):()=>number {
  let value=seed>>>0;
  return ()=>{
    value=(Math.imul(1664525,value)+1013904223)>>>0;
    return value/4294967296;
  };
}
function seedRows(now=Date.now()):TransactionRow[] {
  const rng=seededRandom();
  const rows:TransactionRow[]=[];
  for(let i=0;i<480;i++){
    const risk=rng();
    const category=CATEGORIES[Math.floor(rng()*CATEGORIES.length)];
    const amount=risk>0.73? 50000+rng()*170000 : 120+rng()*36000;
    const payload:TransactionPayload = {
      transaction_id:"FG-"+(100001+i),
      amount_inr:Math.round(amount*100)/100,
      country:risk>0.84?["US","GB","AE"][Math.floor(rng()*3)]:"IN",
      home_country:"IN",
      transactions_last_hour:risk>0.63?5+Math.floor(rng()*7):Math.floor(rng()*5),
      device_is_new:risk>0.67,
      distance_from_home_km:risk>0.81?1100+Math.floor(rng()*4900):Math.floor(rng()*950),
      merchant_category:category,
    };
    const assessment=evaluateRules(payload);
    const when=now-(rng()*29.5*24*60*60*1000);
    const merchants=MERCHANTS[category];
    rows.push({
      id:payload.transaction_id,timestamp:new Date(when).toISOString(),
      merchant:merchants[Math.floor(rng()*merchants.length)],
      amount:payload.amount_inr,currency:"INR",category,
      country:payload.country,home_country:"IN",
      device_is_new:payload.device_is_new,
      transactions_last_hour:payload.transactions_last_hour,
      distance_from_home_km:payload.distance_from_home_km,
      risk_score:assessment.score,decision:assessment.decision,
      reasons:assessment.triggered_rules,
      case_status:assessment.decision==="APPROVE"?"NONE":"OPEN",
      source:"synthetic",
    });
  }
  return rows.sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
}
const BASELINE=seedRows();

function readState():LocalState {
  try {
    const raw=localStorage.getItem(STORAGE);
    if(!raw) return {evaluations:[],statuses:{}};
    const result=JSON.parse(raw) as Partial<LocalState>;
    if(!Array.isArray(result.evaluations))throw new Error("invalid local state");
    return {
      evaluations:result.evaluations.filter(r=>r&&typeof r.id==="string"&&typeof r.risk_score==="number").slice(0,220),
      statuses:result.statuses && typeof result.statuses==="object" ? result.statuses:{},
    };
  }catch{return {evaluations:[],statuses:{}};}
}
function writeState(state:LocalState):void {
  try{localStorage.setItem(STORAGE,JSON.stringify(state));}
  catch { /* Demo continues if storage is disabled / quota exhausted. */ }
}
export async function getTransactions():Promise<TransactionRow[]> {
  const state=readState();
  return [...state.evaluations,...BASELINE]
    .map(row=>state.statuses[row.id]?{...row,case_status:state.statuses[row.id]}:row)
    .sort((a,b)=>b.timestamp.localeCompare(a.timestamp))
    .slice(0,MAX_ROWS);
}
export async function getRules():Promise<RiskRule[]> {return RISK_RULES.map(x=>({...x}));}

function valid(t:TransactionPayload):boolean{
  return !!t && typeof t.transaction_id==="string" && !!t.transaction_id.trim() &&
    t.transaction_id.length<=64 && typeof t.amount_inr==="number" &&
    Number.isFinite(t.amount_inr)&&t.amount_inr>0&&t.amount_inr<=9999999999.99&&
    Math.abs(t.amount_inr*100-Math.round(t.amount_inr*100))<1e-6 &&
    typeof t.country==="string"&&/^[A-Z]{2}$/.test(t.country)&&
    typeof t.home_country==="string"&&/^[A-Z]{2}$/.test(t.home_country)&&
    Number.isInteger(t.transactions_last_hour)&&t.transactions_last_hour>=0&&t.transactions_last_hour<=100000&&
    typeof t.device_is_new==="boolean"&&Number.isFinite(t.distance_from_home_km)&&
    t.distance_from_home_km>=0&&t.distance_from_home_km<=40075&&
    CATEGORIES.includes(t.merchant_category);
}
export async function evaluateTransaction(value:TransactionPayload):Promise<Evaluation> {
  if(!valid(value))throw new Error("Invalid transaction input. Check amount, country, distance and category.");
  const result=evaluateRules(value);
  const state=readState();
  const id="SIM-"+(typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID().slice(0,8).toUpperCase():Math.random().toString(36).slice(2,10).toUpperCase());
  const row:TransactionRow = {
    id,timestamp:new Date().toISOString(),merchant:"Live simulator",
    amount:value.amount_inr,currency:"INR",category:value.merchant_category,
    country:value.country,home_country:value.home_country,
    device_is_new:value.device_is_new,transactions_last_hour:value.transactions_last_hour,
    distance_from_home_km:value.distance_from_home_km,
    risk_score:result.score,decision:result.decision,reasons:result.triggered_rules,
    case_status:result.decision==="APPROVE"?"NONE":"OPEN",
    source:"simulated-session",
  };
  state.evaluations.unshift(row);
  state.evaluations=state.evaluations.slice(0,220);
  writeState(state);
  return result;
}
export async function updateCase(id:string,status:Exclude<CaseStatus,"NONE">):Promise<TransactionRow> {
  if(!["OPEN","INVESTIGATING","RESOLVED"].includes(status))throw new Error("Invalid case status");
  const current=(await getTransactions()).find(x=>x.id===id&&x.decision!=="APPROVE");
  if(!current)throw new Error("Investigation case not found");
  const state=readState();
  state.statuses[id]=status;
  writeState(state);
  return {...current,case_status:status};
}

let lastPipeline:{timestamp:number,result:PipelineResponse}|null=null;
export async function getPipeline():Promise<PipelineResponse>{
  if(lastPipeline&&Date.now()-lastPipeline.timestamp<75000)return lastPipeline.result;
  let result:PipelineResponse;
  try{
    const resp=await fetch("https://api.github.com/repos/"+REPO+"/actions/runs?per_page=12",{
      headers:{"Accept":"application/vnd.github+json"},
    });
    if(!resp.ok)throw new Error("GitHub Actions API returned HTTP "+resp.status);
    const body=await resp.json() as {workflow_runs?:Array<Record<string,unknown>>};
    const runs=(body.workflow_runs??[]).map(r=>({
      id:Number(r.id),name:String(r.name??"GitHub Actions"),branch:String(r.head_branch??""),
      status:String(r.status??"unknown"),conclusion:r.conclusion===null?null:String(r.conclusion??""),
      event:String(r.event??""),commit:String(r.head_sha??"").slice(0,7),
      created_at:String(r.created_at??""),url:String(r.html_url??""),
      title:String(r.display_title??"Workflow run").slice(0,120),
    }));
    result={source:"github",repository:REPO,runs,message:null};
  }catch{
    result={source:"unavailable",repository:REPO,runs:[],message:"GitHub status is temporarily unavailable. Open Actions for current information."};
  }
  lastPipeline={timestamp:Date.now(),result};
  return result;
}

type JsonApiItem = {id?:unknown;attributes?:Record<string,unknown>};
async function dogFetch(endpoint:string,cache:RequestCache="default"):Promise<JsonApiItem[]>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(DOG_BASE+endpoint,{
      headers:{Accept:"application/vnd.api+json, application/json"},
      cache,signal:controller.signal,
    });
    if(!response.ok)throw new Error("Dog API returned HTTP "+response.status);
    const body=await response.json() as {data?:unknown};
    if(!Array.isArray(body.data))throw new Error("Dog API returned an invalid response.");
    return body.data as JsonApiItem[];
  }catch(e){
    throw new Error(e instanceof Error && e.message.startsWith("Dog API returned")?e.message:"Dog API is unavailable. Check your connection and retry.");
  }finally{clearTimeout(timeout);}
}
function imageMeta(images:unknown):Pick<DogBreed,"image_url"|"image_credit">{
  if(!Array.isArray(images))return {image_url:null,image_credit:null};
  for(const item of images){
    if(!item||typeof item!=="object")continue;
    const obj=item as Record<string,unknown>;
    const img=obj.medium??obj.thumb??obj.url;
    if(typeof img!=="string"||!img.startsWith("https://"))continue;
    const credit=(obj.attribution??{}) as Record<string,unknown>;
    return {
      image_url:img,
      image_credit:{
        author:String(credit.author??"Unknown"),
        license:String(credit.license??"See source"),
        source_url:String(credit.source_url??""),
      },
    };
  }
  return {image_url:null,image_credit:null};
}
let lastBreeds:{timestamp:number,result:DogBreedsResponse}|null=null;
export async function getDogBreeds():Promise<DogBreedsResponse>{
  if(lastBreeds && Date.now()-lastBreeds.timestamp<300000)return lastBreeds.result;
  const data=await dogFetch("/breeds?page%5Bsize%5D=1000");
  const breeds:DogBreed[]=data.flatMap(b=>{
    const attrs=b.attributes;
    if(!attrs||typeof attrs.name!=="string"||!attrs.name.trim())return [];
    const life=attrs.life && typeof attrs.life==="object"?attrs.life as Record<string,unknown>:{};
    return [{
      id:String(b.id??""),name:attrs.name,
      description:String(attrs.description??""),
      life_min:typeof life.min==="number"?life.min:null,
      life_max:typeof life.max==="number"?life.max:null,
      hypoallergenic:attrs.hypoallergenic===true,
      ...imageMeta(attrs.images),
    }];
  });
  const result={source:"dogapi.dog",count:breeds.length,breeds};
  lastBreeds={timestamp:Date.now(),result};
  return result;
}
export async function getDogFacts(limit=3):Promise<DogFactsResponse>{
  const validLimit=Math.max(1,Math.min(5,Math.trunc(limit)));
  const data=await dogFetch("/facts?limit="+validLimit,"no-store");
  return {source:"dogapi.dog",facts:data.flatMap(f=>{
    const body=f.attributes?.body;
    return typeof body==="string"&&body.trim()?[{id:String(f.id??""),text:body}]:[];
  })};
}
