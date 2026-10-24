import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanCloudUrl, probeCloud, storeCloudUrl, useBrowserDemoPreference, restoreCloudDefault } from "./cloudConfig";

const settings=new Map<string,string>();
vi.stubGlobal("localStorage",{
  getItem:(key:string)=>settings.get(key)??null,
  setItem:(key:string,value:string)=>{settings.set(key,value);},
  removeItem:(key:string)=>{settings.delete(key);},
});
afterEach(()=>{settings.clear();});

describe("Cloud API connection validation",()=>{
  it("accepts a root HTTPS origin but refuses unsafe or malformed URLs",()=>{
    expect(cleanCloudUrl("https://fraudgate-api.onrender.com/")).toBe("https://fraudgate-api.onrender.com");
    expect(cleanCloudUrl("http://localhost:8000")).toBe("http://localhost:8000");
    expect(cleanCloudUrl("http://example.com")).toBeNull();
    expect(cleanCloudUrl("https://example.com/other")).toBeNull();
    expect(cleanCloudUrl("https://example.com?token=secret")).toBeNull();
    expect(cleanCloudUrl("https://user:pass@example.com")).toBeNull();
  });
  it("requires correct FraudGate health response before accepting a cloud connection",async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"ok",service:"fraudgate"}),{
      status:200,headers:{"content-type":"application/json"}
    }));
    vi.stubGlobal("fetch",fetchMock);
    const verified=await probeCloud("https://fraudgate-api.onrender.com");
    expect(verified.base).toBe("https://fraudgate-api.onrender.com");
    expect(fetchMock.mock.calls[0][0]).toBe("https://fraudgate-api.onrender.com/health");
    storeCloudUrl(verified.base);
    useBrowserDemoPreference();
    restoreCloudDefault();
  });
  it("rejects unknown APIs and HTTP errors",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"ok",service:"other"}),{status:200})));
    await expect(probeCloud("https://other.onrender.com")).rejects.toThrow("not the FraudGate");
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("Unavailable",{status:503})));
    await expect(probeCloud("https://other.onrender.com")).rejects.toThrow("503");
  });
});
