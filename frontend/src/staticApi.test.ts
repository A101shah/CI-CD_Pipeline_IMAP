import { describe, it, expect, vi, afterEach } from "vitest";
import { evaluateRules, RISK_RULES, getTransactions, evaluateTransaction, updateCase, getDogFacts } from "./staticApi";
import type { TransactionPayload } from "./types";
const storage = new Map<string,string>();
vi.stubGlobal("localStorage",{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);}});
const sample:TransactionPayload={transaction_id:"DEMO-001",amount_inr:2400,country:"IN",home_country:"IN",transactions_last_hour:1,device_is_new:false,distance_from_home_km:15,merchant_category:"groceries"};
afterEach(()=>{storage.clear();vi.unstubAllGlobals();});
describe("Pages offline fraud simulator",()=>{
 it("implements six matching risk rules and approval boundaries",()=>{
   expect(RISK_RULES).toHaveLength(6);
   expect(evaluateRules(sample).decision).toBe("APPROVE");
   expect(evaluateRules({...sample,amount_inr:64000,merchant_category:"gift_cards"}).decision).toBe("REVIEW");
   expect(evaluateRules({...sample,amount_inr:92000,country:"AE",transactions_last_hour:7,device_is_new:true,distance_from_home_km:2500}).decision).toBe("BLOCK");
 });
 it("loads 480 seeded transactions and saves a simulation and status",async()=>{
   expect(await getTransactions()).toHaveLength(480);
   expect((await evaluateTransaction({...sample,amount_inr:64000,merchant_category:"gift_cards"})).score).toBe(40);
   const updated=(await getTransactions()).find(x=>x.source==="simulated-session");
   expect(updated).toBeDefined();
   expect(await getTransactions()).toHaveLength(481);
   expect((await updateCase(updated!.id,"RESOLVED")).case_status).toBe("RESOLVED");
 });
 it("rejects invalid transactions",async()=>{
   await expect(evaluateTransaction({...sample,amount_inr:-1})).rejects.toThrow("Invalid transaction");
 });
 it("gets Dog API facts directly without storing them",async()=>{
   const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[{id:"f1",attributes:{body:"Dogs are mammals."}}]}),{status:200}));
   vi.stubGlobal("fetch",fetchMock);
   const result=await getDogFacts();
   expect(result.facts[0].text).toBe("Dogs are mammals.");
   expect(fetchMock.mock.calls[0][1]).toMatchObject({cache:"no-store"});
 });
});
