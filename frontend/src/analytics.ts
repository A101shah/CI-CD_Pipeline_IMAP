import type { Decision, TransactionRow } from "./types";
export type Range = "24h" | "7d" | "30d";
export const money = (v: number, digits = 0) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: digits }).format(v);
export const number = (v: number) => new Intl.NumberFormat("en-IN").format(v);
export const pct = (v: number) => v.toFixed(1) + "%";
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
export const fullDate = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
export const decisionColors: Record<Decision, string> = { APPROVE: "#54deb5", REVIEW: "#f5bb70", BLOCK: "#fa738a" };
export function selectRange(rows: TransactionRow[], range: Range, now = Date.now()) {
  const ms = range === "24h" ? 86400000 : range === "7d" ? 7 * 86400000 : 30 * 86400000;
  return rows.filter(r => now - new Date(r.timestamp).getTime() <= ms && new Date(r.timestamp).getTime() <= now);
}
export function summarize(rows: TransactionRow[]) {
  const total = rows.length;
  const approved = rows.filter(r => r.decision === "APPROVE").length;
  const review = rows.filter(r => r.decision === "REVIEW").length;
  const blocked = rows.filter(r => r.decision === "BLOCK").length;
  const flagged = review + blocked;
  const volume = rows.reduce((n, r) => n + r.amount, 0);
  const average = total ? rows.reduce((n, r) => n + r.risk_score, 0) / total : 0;
  return { total, approved, review, blocked, flagged, volume, average, approvalRate: total ? approved / total * 100 : 0, flagRate: total ? flagged / total * 100 : 0 };
}
export function decisions(rows: TransactionRow[]) {
  const s = summarize(rows);
  return [{name:"Approved",value:s.approved,color:decisionColors.APPROVE},{name:"Review",value:s.review,color:decisionColors.REVIEW},{name:"Blocked",value:s.blocked,color:decisionColors.BLOCK}];
}
export function dailySeries(rows: TransactionRow[]) {
  const byDay = new Map<string, { day: string; total: number; flagged: number; approved: number }>();
  for(const row of rows) {
    const key = row.timestamp.slice(0, 10);
    const slot = byDay.get(key) ?? { day:key, total:0, flagged:0, approved:0 };
    slot.total++;
    if (row.decision === "APPROVE") slot.approved++; else slot.flagged++;
    byDay.set(key, slot);
  }
  return [...byDay.values()].sort((a,b)=>a.day.localeCompare(b.day))
    .map(x => ({...x, label:shortDate(x.day + "T12:00:00Z")}));
}
export function categorySeries(rows: TransactionRow[]) {
  const summary = new Map<string, { name: string; total: number; flagged: number }>();
  for(const row of rows) {
    const name = row.category.replace(/_/g," ");
    const item = summary.get(name) ?? { name, total:0, flagged:0 };
    item.total++;
    if(row.decision !== "APPROVE") item.flagged++;
    summary.set(name,item);
  }
  return [...summary.values()].sort((a,b)=>b.total-a.total).slice(0,6);
}
export function topSignals(rows: TransactionRow[]) {
  const signals = new Map<string, {code:string;label:string;count:number;points:number}>();
  for(const row of rows) for(const rule of row.reasons) {
    const item = signals.get(rule.code) ?? {code:rule.code,label:rule.code.replaceAll("_"," "),count:0,points:rule.points};
    item.count++; signals.set(rule.code,item);
  }
  return [...signals.values()].sort((a,b)=>b.count-a.count);
}
export function downloadCSV(rows: TransactionRow[]) {
  const header = ["Transaction ID","Timestamp","Merchant","Amount INR","Category","Country","Risk score","Decision","Case status","Source"];
  const escape = (s: unknown) => '"' + String(s ?? "").replaceAll('"','""') + '"';
  const body = rows.map(r=>[r.id,r.timestamp,r.merchant,r.amount,r.category,r.country,r.risk_score,r.decision,r.case_status,r.source].map(escape).join(","));
  const file = new Blob([[header.join(","),...body].join("\n")],{type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");a.href=url;a.download="fraudgate-synthetic-transactions.csv";a.click();URL.revokeObjectURL(url);
}
