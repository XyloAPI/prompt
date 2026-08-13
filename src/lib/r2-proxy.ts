import { AwsClient } from "aws4fetch";
import type { R2Account, R2Bucket } from "@/db/schema";

export const dynamic = "force-dynamic";

export const BUCKET_CACHE_TTL = 5 * 60 * 1000;
export const BUFFER_CAP = 4 * 1024 * 1024;
export const CACHE_TTL_SECONDS = 86400;

type BucketRef = { bucket: R2Bucket | null; account: R2Account | null; at: number };

export const bucketCache = new Map<string, BucketRef>();

export async function resolveBucket(bucketName: string): Promise<{ bucket: R2Bucket | null; account: R2Account | null }> {
  const cached = bucketCache.get(bucketName);
  if (cached && Date.now() - cached.at < BUCKET_CACHE_TTL) {
    return { bucket: cached.bucket, account: cached.account };
  }

  // Try Cloudflare Edge Cache for the bucket config
  const cacheKeyUrl = `https://cache.local/resolve-bucket/${encodeURIComponent(bucketName)}`;
  if (cacheApi) {
    try {
      const cachedResponse = await cacheApi.default.match(cacheKeyUrl);
      if (cachedResponse) {
        const data = await cachedResponse.json() as { bucket: R2Bucket | null; account: R2Account | null };
        bucketCache.set(bucketName, { bucket: data.bucket, account: data.account, at: Date.now() });
        return data;
      }
    } catch (e) {
      console.error("Failed to read bucket cache:", e);
    }
  }

  // Cache miss - dynamically import query module to avoid loading Drizzle on cache hit
  const { getR2BucketByName, getR2Accounts } = await import("@/db/queries");
  const bucket = await getR2BucketByName(bucketName);
  const account = bucket
    ? ((await getR2Accounts()).find((a) => a.id === bucket.accountId) ?? null)
    : null;

  const data = { bucket, account };
  bucketCache.set(bucketName, { bucket, account, at: Date.now() });

  if (cacheApi) {
    try {
      const resp = new Response(JSON.stringify(data), {
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=3600",
        },
      });
      await cacheApi.default.put(cacheKeyUrl, resp);
    } catch (e) {
      console.error("Failed to write bucket cache:", e);
    }
  }

  return data;
}

type CachesLike = {
  default: {
    match: (request: Request | string) => Promise<Response | undefined>;
    put: (request: Request | string, response: Response) => Promise<void>;
  };
};

const cacheApi = (globalThis as unknown as { caches?: CachesLike }).caches;

function cacheKey(url: string): Request {
  return new Request(url, { method: "GET" });
}

/**
 * Serves an R2 object by proxying its bytes through the worker — no redirect.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
 *
 * The browser only ever sees the web-domain URL; the R2 origin (and any
 * signature) stays server-side. Small/medium objects are buffered, given a
 * real `content-length`, and stored in Cloudflare's edge cache so repeated
 * loads don't touch R2 (or the DB) again. Large objects and Range requests
 * (video seeking) are streamed straight through.
 */
export async function serveR2Object(request: Request, bucketName: string, parts: string[]): Promise<Response> {
  if (parts.length === 0 || parts.some((p) => !p || p.includes(".."))) {
    return new Response("Bad Request", { status: 400 });
  }

  const key = `images/${parts.join("/")}`;
  const range = request.headers.get("range");

  if (!range && cacheApi) {
    try {
      const cached = await cacheApi.default.match(cacheKey(request.url));
      if (cached) return cached;
    } catch {}
  }

  const { bucket, account } = await resolveBucket(bucketName);
  if (!bucket || !account) return new Response("Not Found", { status: 404 });

  try {
    const client = new AwsClient({
      accessKeyId: account.accessKeyId,
      secretAccessKey: account.secretAccessKey,
      service: "s3",
      region: "auto",
    });
    const origin = `https://${account.accountId}.r2.cloudflarestorage.com/${bucket.name}/${key}`;

    const upstream = await client.fetch(origin, {
      method: "GET",
      headers: range ? { Range: range } : undefined,
    });
    if (upstream.status === 404) return new Response("Not Found", { status: 404 });
    if (upstream.status !== 200 && upstream.status !== 206) {
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") ?? "text/plain",
        },
      });
    }

    const outHeaders = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) outHeaders.set("content-type", ct);
    const etag = upstream.headers.get("etag");
    if (etag) outHeaders.set("etag", etag);
    outHeaders.set("accept-ranges", "bytes");
    outHeaders.set("cache-control", `public, max-age=${CACHE_TTL_SECONDS}`);

    if (upstream.status === 206) {
      const cr = upstream.headers.get("content-range");
      if (cr) outHeaders.set("content-range", cr);
      const cl = upstream.headers.get("content-length");
      if (cl) outHeaders.set("content-length", cl);
      return new Response(upstream.body, { status: 206, headers: outHeaders });
    }

    const declared = upstream.headers.get("content-length");
    if (declared) {
      outHeaders.set("content-length", declared);
    }

    const size = declared ? Number(declared) : 0;
    const shouldCache = !range && size > 0 && size <= BUFFER_CAP && cacheApi;

    const resp = new Response(upstream.body, { status: 200, headers: outHeaders });
    if (shouldCache) {
      try {
        await cacheApi.default.put(cacheKey(request.url), resp.clone());
      } catch {}
    }

    return resp;
  } catch (err) {
    console.error("R2 proxy failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}