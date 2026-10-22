export type Decision = "APPROVE" | "REVIEW" | "BLOCK";
export type CaseStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "NONE";
export type Page = "overview" | "transactions" | "investigations" | "risk-engine" | "pipelines";
export interface RuleHit { code: string; reason: string; points: number }
export interface TransactionRow {
  id: string; timestamp: string; merchant: string; amount: number; currency: string;
  category: string; country: string; home_country: string; risk_score: number;
  decision: Decision; reasons: RuleHit[]; case_status: CaseStatus; source: string;
  device_is_new: boolean; transactions_last_hour: number; distance_from_home_km: number;
}
export interface RiskRule { code: string; description: string; points: number }
export interface Evaluation { transaction_id: string; score: number; decision: Decision; triggered_rules: RuleHit[]; explanation: string }
export interface TransactionPayload {
  transaction_id: string; amount_inr: number; country: string; home_country: string;
  transactions_last_hour: number; device_is_new: boolean;
  distance_from_home_km: number; merchant_category: string;
}
export interface WorkflowRun {
  id: number; name: string; branch: string; status: string; conclusion: string | null;
  event: string; commit: string; created_at: string; url: string; title: string;
}
export interface PipelineResponse { source: "github" | "unavailable"; repository: string; runs: WorkflowRun[]; message: string | null }
