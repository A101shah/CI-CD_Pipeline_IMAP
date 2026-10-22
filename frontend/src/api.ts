import type { CaseStatus, Evaluation, PipelineResponse, RiskRule, TransactionPayload, TransactionRow } from "./types";
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.detail === "string" ? payload.detail : "Request failed (" + response.status + ")");
  }
  return response.json() as Promise<T>;
}
export const getTransactions = () => json<TransactionRow[]>("/api/v1/transactions?limit=700");
export const getRules = () => json<RiskRule[]>("/api/v1/rules");
export const getPipeline = () => json<PipelineResponse>("/api/v1/pipeline");
export const evaluateTransaction = (value: TransactionPayload) =>
  json<Evaluation>("/api/v1/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
export const updateCase = (id: string, status: Exclude<CaseStatus, "NONE">) =>
  json<TransactionRow>("/api/v1/cases/" + encodeURIComponent(id), {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
  });
