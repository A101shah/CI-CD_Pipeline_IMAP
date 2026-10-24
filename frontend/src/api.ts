import type { DogBreedsResponse, DogFactsResponse, CaseStatus, Evaluation, PipelineResponse, RiskRule, TransactionPayload, TransactionRow } from "./types";
async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload?.detail;
    const message = typeof detail === "string" ? detail
      : Array.isArray(detail) ? detail.map((issue: { loc?: (string | number)[]; msg?: string }) => {
          const field = issue.loc?.slice(1).join(".") || "request";
          return field + ": " + (issue.msg || "Invalid value");
        }).join("; ")
      : "Request failed (" + response.status + ")";
    throw new Error(message);
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

export const getDogBreeds = () => json<DogBreedsResponse>("/api/v1/dog/breeds");
export const getDogFacts = (limit=3) => json<DogFactsResponse>("/api/v1/dog/facts?limit="+Math.max(1,Math.min(5,Math.trunc(limit))));
