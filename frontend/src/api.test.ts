import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateTransaction } from "./api";
import type { TransactionPayload } from "./types";

const payload: TransactionPayload = {
  transaction_id: "TEST-001",
  amount_inr: 50000,
  country: "IN",
  home_country: "IN",
  transactions_last_hour: 1,
  device_is_new: false,
  distance_from_home_km: 0,
  merchant_category: "gift_cards",
};
afterEach(() => vi.unstubAllGlobals());

describe("Risk Decision Lab client", () => {
  it("posts the typed transaction payload to the correct FastAPI endpoint", async () => {
    const response = {
      transaction_id: "TEST-001", score: 40, decision: "REVIEW",
      triggered_rules: [{ code: "HIGH_AMOUNT", reason: "High amount", points: 30 },
        { code: "GIFT_CARD", reason: "Gift card", points: 10 }],
      explanation: "Moderate rule-based risk",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await evaluateTransaction(payload);
    expect(result.score).toBe(40);
    expect(result.decision).toBe("REVIEW");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/evaluate", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(payload),
    }));
  });

  it("presents the affected field when FastAPI rejects an input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: [
        { loc: ["body", "amount_inr"], msg: "Input should be greater than 0" },
      ] }), { status: 422, headers: { "content-type": "application/json" } }),
    ));
    await expect(evaluateTransaction({ ...payload, amount_inr: 0 }))
      .rejects.toThrow("amount_inr: Input should be greater than 0");
  });

  it("shows a meaningful error when the FastAPI server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(evaluateTransaction(payload)).rejects.toThrow("FastAPI is unreachable");
  });
});
