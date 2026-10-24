/**
 * GitHub Pages -> cloud FastAPI connection settings.
 * The public backend address is not a secret and is safe to store in the browser.
 * No credentials, payment information, or tokens should be entered here.
 */
export const STATIC_PAGES = import.meta.env.VITE_STATIC_MODE === "true";
const STORAGE_KEY = "fraudgate-cloud-api-url-v1";
const DISABLED = "__browser_demo__";
const BUILT_IN_URL = String(import.meta.env.VITE_CLOUD_API_URL || "").trim();

export function cleanCloudUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());
    const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}
function preference(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); }
  catch { return null; }
}
export function getCloudBaseUrl(): string {
  if (!STATIC_PAGES) return "";
  const saved = preference();
  if (saved === DISABLED) return "";
  if (saved !== null) return cleanCloudUrl(saved) || "";
  return cleanCloudUrl(BUILT_IN_URL) || "";
}
export function isCloudMode(): boolean {
  return STATIC_PAGES && Boolean(getCloudBaseUrl());
}
export function useBrowserDemo(): boolean {
  return STATIC_PAGES && !getCloudBaseUrl();
}
export function storeCloudUrl(url: string): void {
  const valid = cleanCloudUrl(url);
  if (!valid) throw new Error("Enter the root HTTPS URL of the hosted FastAPI service (no path or query).");
  localStorage.setItem(STORAGE_KEY, valid);
}
export function useBrowserDemoPreference(): void {
  localStorage.setItem(STORAGE_KEY, DISABLED);
}
export function restoreCloudDefault(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function probeCloud(url: string): Promise<{base:string;status:string}> {
  const base=cleanCloudUrl(url);
  if (!base) throw new Error("Use the root HTTPS URL of your cloud API, such as https://your-service.onrender.com");
  const controller=new AbortController();
  // Render free services may need some time to wake from idle.
  const timeout=setTimeout(()=>controller.abort(),75000);
  try {
    const response=await fetch(base+"/health",{
      headers:{Accept:"application/json"},
      signal:controller.signal,
      cache:"no-store",
    });
    if(!response.ok) throw new Error("Backend health check returned HTTP "+response.status);
    const body=await response.json() as {status?:string;service?:string};
    if(body.status!=="ok"||body.service!=="fraudgate"){
      throw new Error("That address is responding, but it is not the FraudGate FastAPI service.");
    }
    return {base,status:body.status};
  } catch(e) {
    if(e instanceof Error && e.name==="AbortError")throw new Error("Cloud backend did not respond in time; check its Render deployment.");
    if(e instanceof Error && e.message.startsWith("Backend health"))throw e;
    if(e instanceof Error && e.message.startsWith("That address"))throw e;
    throw new Error("Unable to reach FastAPI. Check its URL, health status and allowed CORS origin.");
  } finally { clearTimeout(timeout); }
}
