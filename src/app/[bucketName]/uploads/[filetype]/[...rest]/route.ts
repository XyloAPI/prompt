import { getR2BucketByName, getR2Accounts } from "@/db/queries";
import { getObjectBuffer } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Serves images from R2.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
 */
export async function GET(
  _request: Request,
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

  let bytes: Buffer;
  let contentType = "application/octet-stream";
  try {
    const res = await getObjectBuffer({ account, bucketName: bucket.name, key });
    bytes = res.bytes;
    contentType = res.contentType || "application/octet-stream";
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
