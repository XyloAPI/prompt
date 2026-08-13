import { getR2BucketByName, getR2Accounts } from "@/db/queries";
import { AwsClient } from "aws4fetch";
import type { R2Account, R2Bucket } from "@/db/schema";

export const dynamic = "force-dynamic";

const BUCKET_CACHE_TTL = 5 * 60 * 1000;
const HARD_BUFFER_CAP = 64 * 1024 * 1024;

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

  bucketCache.set(bucketName, {
    bucket,
    account,
    at: Date.now(),
  });
  return { bucket, account };
}

/**
 * Serves R2 objects by proxying the bytes through the worker — no redirect.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
 *
 * The browser only ever sees the web-domain URL; the R2 origin (and any
 * signature) stays server-side. Responses carry a real `content-length` so
 * Cloudflare's edge cache can serve them — the worker only runs once per
 * asset, which keeps load (and 503s) away. Range requests are honored for
 * <video> seeking; very large objects are streamed instead of buffered.
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

    const range = request.headers.get("range");

    const head = await client.fetch(origin, { method: "HEAD" });
    if (head.status === 404) return new Response("Not Found", { status: 404 });
    const size = Number(head.headers.get("content-length") ?? 0);
    const etag = head.headers.get("etag") ?? "";

    const upstream = await client.fetch(origin, {
      method: "GET",
      headers: range ? { Range: range } : undefined,
    });
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
    if (etag) outHeaders.set("etag", etag);
    outHeaders.set("accept-ranges", "bytes");
    outHeaders.set("cache-control", "public, max-age=86400, s-maxage=86400");

    if (upstream.status === 206) {
      outHeaders.set("content-length", upstream.headers.get("content-length") ?? "");
      const cr = upstream.headers.get("content-range");
      if (cr) outHeaders.set("content-range", cr);
      return new Response(upstream.body, { status: 206, headers: outHeaders });
    }

    if (size > HARD_BUFFER_CAP) {
      return new Response(upstream.body, { status: 200, headers: outHeaders });
    }

    const buf = await upstream.arrayBuffer();
    outHeaders.set("content-length", String(buf.byteLength));
    return new Response(buf, { status: 200, headers: outHeaders });
  } catch (err) {
    console.error("R2 proxy failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
