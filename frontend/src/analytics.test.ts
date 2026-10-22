import { describe,expect,it } from "vitest";
import { categorySeries,dailySeries,decisions,selectRange,summarize,topSignals } from "./analytics";
import type { TransactionRow } from "./types";
const point=(id:string,decision:"APPROVE"|"REVIEW"|"BLOCK",risk_score:number,category="groceries"):TransactionRow=>({
 id,timestamp:"2026-10-22T12:00:00Z",merchant:"Test Merchant",amount:1000,currency:"INR",category,country:"IN",home_country:"IN",
 risk_score,decision,reasons:decision==="APPROVE"?[]:[{code:"NEW_DEVICE",reason:"New device",points:15}],
 case_status:decision==="APPROVE"?"NONE":"OPEN",source:"synthetic",device_is_new:false,transactions_last_hour:1,distance_from_home_km:5
});
const rows=[point("1","APPROVE",0),point("2","REVIEW",45),point("3","BLOCK",80,"electronics")];
describe("analytics",()=>{
 it("aggregates decisions",()=>{expect(summarize(rows)).toMatchObject({total:3,approved:1,review:1,blocked:1,flagged:2,volume:3000});});
 it("handles empty input",()=>{expect(summarize([])).toMatchObject({total:0,average:0,approvalRate:0});});
 it("generates donut distribution",()=>{expect(decisions(rows).map(x=>x.value)).toEqual([1,1,1]);});
 it("groups by day",()=>{expect(dailySeries(rows)).toMatchObject([{total:3,flagged:2,approved:1}]);});
 it("aggregates risk signals",()=>{expect(topSignals(rows)[0].count).toBe(2);expect(categorySeries(rows)[0].total).toBe(2);});
 it("filters correct time ranges",()=>{expect(selectRange(rows,"24h",Date.parse("2026-10-22T14:00:00Z"))).toHaveLength(3);expect(selectRange(rows,"7d",Date.parse("2026-11-10T14:00:00Z"))).toHaveLength(0);});
});
