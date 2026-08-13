import { getR2BucketByName, getR2Accounts } from "@/db/queries";
import { AwsClient } from "aws4fetch";

export const dynamic = "force-dynamic";

/**
 * Serves R2 objects by proxying the bytes through the worker — no redirect.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
 *
 * The browser only ever sees the web-domain URL; the R2 origin (and any
 * signature) stays server-side. Range requests are forwarded so <video>
 * seeking and resume work. Missing objects surface R2's own 404.
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

  const bucket = await getR2BucketByName(decodeURIComponent(bucketName));
  if (!bucket) return new Response("Not Found", { status: 404 });
  const account = (await getR2Accounts()).find((a) => a.id === bucket.accountId);
  if (!account) return new Response("Not Found", { status: 404 });

  const key = `images/${parts.join("/")}`;

  try {
    const client = new AwsClient({
      accessKeyId: account.accessKeyId,
      secretAccessKey: account.secretAccessKey,
      service: "s3",
      region: "auto",
    });

    const upstream = await client.fetch(
      `https://${account.accountId}.r2.cloudflarestorage.com/${bucket.name}/${key}`,
      {
        method: "GET",
        headers:
          typeof request.headers.get("range") === "string"
            ? { Range: request.headers.get("range")! }
            : undefined,
      }
    );

    const outHeaders = new Headers();
    for (const h of ["content-type", "content-length", "content-range", "etag"]) {
      const v = upstream.headers.get(h);
      if (v) outHeaders.set(h, v);
    }
    outHeaders.set("accept-ranges", "bytes");
    outHeaders.set("cache-control", "public, max-age=86400, s-maxage=86400");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (err) {
    console.error("R2 proxy failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
