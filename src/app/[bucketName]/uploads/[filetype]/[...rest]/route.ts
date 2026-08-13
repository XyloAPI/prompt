import { getR2BucketByName, getR2Accounts } from "@/db/queries";
import { AwsClient } from "aws4fetch";
import type { R2Account, R2Bucket } from "@/db/schema";

export const dynamic = "force-dynamic";

const BUCKET_CACHE_TTL = 5 * 60 * 1000;
const BUFFER_CAP = 4 * 1024 * 1024;
const CACHE_TTL_SECONDS = 86400;

type BucketRef = { bucket: R2Bucket | null; account: R2Account | null; at: number };

const bucketCache = new Map<string, BucketRef>();

async function resolveBucket(bucketName: string): Promise<{ bucket: R2Bucket | null; account: R2Account | null }> {
  const cached = bucketCache.get(bucketName);
  if (cached && Date.now() - cached.at < BUCKET_CACHE_TTL) {
    return { bucket: cached.bucket, account: cached.account };
  }

  const bucket = await getR2BucketByName(bucketName);
  const account = bucket
    ? ((await getR2Accounts()).find((a) => a.id === bucket.accountId) ?? null)
    : null;

  bucketCache.set(bucketName, { bucket, account, at: Date.now() });
  return { bucket, account };
}

type CachesLike = {
  default: {
    match: (request: Request | string) => Promise<Response | undefined>;
    put: (request: Request | string, response: Response) => Promise<void>;
  };
};

const cacheApi = (globalThis as unknown as { caches?: CachesLike }).caches;

function cacheKey(request: Request): Request {
  return new Request(request.url, { method: "GET" });
}

/**
 * Serves R2 objects by proxying the bytes through the worker — no redirect.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
 *
 * The browser only ever sees the web-domain URL; the R2 origin (and any
 * signature) stays server-side. Small/medium objects are buffered, given a
 * real `content-length`, and stored in Cloudflare's edge cache, so repeated
 * loads are served without touching R2 (or the DB) again. Large objects and
 * Range requests (video seeking) are streamed straight through.
 */
export async function GET(
  request: Request,
  ctx: {
    params: Promise<{ bucketName: string; filetype: string; rest: string[] }>;
  }
) {
  const { bucketName, rest } = await ctx.params;
  const parts = rest.map((p) => decodeURIComponent(p));
  if (parts.length === 0 || parts.some((p) => !p || p.includes(".."))) {
    return new Response("Bad Request", { status: 400 });
  }

  const range = request.headers.get("range");

  if (!range && cacheApi) {
    const cached = await cacheApi.default.match(cacheKey(request));
    if (cached) return cached;
  }

  const { bucket, account } = await resolveBucket(decodeURIComponent(bucketName));
  if (!bucket || !account) return new Response("Not Found", { status: 404 });

  const key = `images/${parts.join("/")}`;

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
    if (declared && Number(declared) > BUFFER_CAP) {
      return new Response(upstream.body, { status: 200, headers: outHeaders });
    }

    const buf = await upstream.arrayBuffer();
    outHeaders.set("content-length", String(buf.byteLength));

    if (buf.byteLength <= BUFFER_CAP && cacheApi) {
      const resp = new Response(buf, { status: 200, headers: outHeaders });
      try {
        await cacheApi.default.put(cacheKey(request), resp.clone());
      } catch (err) {
        console.error("Cache put failed:", err);
      }
      return resp;
    }

    return new Response(buf, { status: 200, headers: outHeaders });
  } catch (err) {
    console.error("R2 proxy failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
