import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const USER_AGENT =
  "bielefeld-studyplan/0.1 (+https://github.com/parimalgavali/bielefeld-studyplan; unofficial student project)";
const DELAY_MS = 1500;
const CACHE_DIR = ".cache/ekvv";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cacheFile = (key: string) => `${CACHE_DIR}/${key.replace(/[^A-Za-z0-9]+/g, "_")}.html`;

export const isCached = (key: string) => process.env.EKVV_CACHE !== "0" && existsSync(cacheFile(key));
export const dropCache = (key: string) => rmSync(cacheFile(key), { force: true });

/** Polite fetch: one request at a time, backs off on 429, caches pages on disk for re-runs. */
export async function fetchHtml(
  url: string,
  opts: { cacheKey?: string; cookie?: string } = {},
): Promise<{ html: string; setCookie: string[] }> {
  const file = opts.cacheKey ? cacheFile(opts.cacheKey) : null;
  if (file && opts.cacheKey && isCached(opts.cacheKey))
    return { html: readFileSync(file, "utf-8"), setCookie: [] };
  for (let attempt = 1; ; attempt++) {
    await sleep(DELAY_MS);
    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (opts.cookie) headers.Cookie = opts.cookie;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) }).catch(
      (err: Error) =>
        ({ ok: false, status: err.name, headers: new Headers(), text: async () => "" }) as const,
    );
    if (res.ok) {
      const html = await res.text();
      if (file) {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(file, html);
      }
      return { html, setCookie: res.headers.getSetCookie() };
    }
    if (attempt >= 6) throw new Error(`${res.status} for ${url}`);
    const retryAfter = Number(res.headers.get("retry-after")) || 0;
    const wait = Math.max(retryAfter * 1000, (res.status === 429 ? 60_000 : 5_000) * attempt);
    console.warn(`  ${res.status} for ${url}, retrying in ${wait / 1000}s`);
    await sleep(wait);
  }
}
