import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("./cloudConfig",()=>({
  STATIC_PAGES:true,
  getCloudBaseUrl:()=>"https://fraudgate-api.onrender.com",
  useBrowserDemo:()=>false,
}));

import { getTransactions, evaluateTransaction, getDogBreeds, getDogFacts, updateCase } from "./api";

afterEach(()=>vi.unstubAllGlobals());

describe("Pages uses the Docker/FastAPI backend when connected",()=>{
  it("loads transactions from the remote backend, not browser mock data",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify([]),{status:200}));
    vi.stubGlobal("fetch",fetchMock);
    expect(await getTransactions()).toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe("https://fraudgate-api.onrender.com/api/v1/transactions?limit=700");
  });
  it("sends risk evaluations as POST requests",async()=>{
    const payload={transaction_id:"TEST-REMOTE",amount_inr:50000,country:"IN",home_country:"IN",transactions_last_hour:1,device_is_new:false,distance_from_home_km:0,merchant_category:"groceries"};
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({transaction_id:"TEST-REMOTE",score:30,decision:"APPROVE",triggered_rules:[],explanation:"OK"}),{status:200}));
    vi.stubGlobal("fetch",fetchMock);
    expect((await evaluateTransaction(payload)).score).toBe(30);
    expect(fetchMock.mock.calls[0][0]).toBe("https://fraudgate-api.onrender.com/api/v1/evaluate");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
  it("routes both Dog API requests through FastAPI instead of calling the provider in-browser",async()=>{
    const fetchMock=vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({source:"dogapi.dog",count:0,breeds:[],facts:[]}),{status:200})));
    vi.stubGlobal("fetch",fetchMock);
    await getDogBreeds();
    await getDogFacts(2);
    expect(fetchMock.mock.calls.map((call:unknown[])=>call[0])).toEqual([
      "https://fraudgate-api.onrender.com/api/v1/dog/breeds",
      "https://fraudgate-api.onrender.com/api/v1/dog/facts?limit=2",
    ]);
  });
  it("sends case updates to the hosted API",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:"FG-100001",case_status:"RESOLVED"}),{status:200}));
    vi.stubGlobal("fetch",fetchMock);
    await updateCase("FG-100001","RESOLVED");
    expect(fetchMock.mock.calls[0][0]).toBe("https://fraudgate-api.onrender.com/api/v1/cases/FG-100001");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
  });
});
