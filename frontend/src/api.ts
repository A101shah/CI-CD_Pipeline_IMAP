import type { DogBreedsResponse, DogFactsResponse, CaseStatus, Evaluation, PipelineResponse, RiskRule, TransactionPayload, TransactionRow } from "./types";
import * as staticApi from "./staticApi";
import { STATIC_PAGES, getCloudBaseUrl, useBrowserDemo } from "./cloudConfig";

async function json<T>(path: string, init?: RequestInit): Promise<T> {

  const base = getCloudBaseUrl();
  const endpoint = base ? base + path : path;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new Error(base
      ? "Cloud FastAPI is unreachable. Check the Render service URL, CORS settings, or use browser-demo mode."
      : "FastAPI is unreachable. Check that the backend is running.");
  }
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
export const getTransactions = () => useBrowserDemo() ? staticApi.getTransactions() : json<TransactionRow[]>("/api/v1/transactions?limit=700");
export const getRules = () => useBrowserDemo() ? staticApi.getRules() : json<RiskRule[]>("/api/v1/rules");
export const getPipeline = () => useBrowserDemo() ? staticApi.getPipeline() : json<PipelineResponse>("/api/v1/pipeline");
export const evaluateTransaction = (value: TransactionPayload) =>
  useBrowserDemo() ? staticApi.evaluateTransaction(value) : json<Evaluation>("/api/v1/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
export const updateCase = (id: string, status: Exclude<CaseStatus, "NONE">) =>
  useBrowserDemo() ? staticApi.updateCase(id,status) : json<TransactionRow>("/api/v1/cases/" + encodeURIComponent(id), {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
  });

export const getDogBreeds = () => useBrowserDemo() ? staticApi.getDogBreeds() : json<DogBreedsResponse>("/api/v1/dog/breeds");
export const getDogFacts = (limit=3) => useBrowserDemo() ? staticApi.getDogFacts(limit) : json<DogFactsResponse>("/api/v1/dog/facts?limit="+Math.max(1,Math.min(5,Math.trunc(limit))));
