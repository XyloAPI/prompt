import { getR2BucketByName, getR2Accounts } from "@/db/queries";
import { createPresignedDownloadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Redirects to R2 presigned URLs.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
 *
 * No existence pre-flight is performed here: it would require an aws-sdk S3
 * request, which fails inside the Cloudflare Worker runtime. Instead the
 * browser is redirected straight to the presigned URL and R2 answers 404 on
 * its own for missing keys.
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
    // Generate presigned GET url and redirect to it (valid for 1 hour)
    const presignedUrl = await createPresignedDownloadUrl({
      account,
      bucketName: bucket.name,
      key,
      expiresIn: 3600,
    });

    return Response.redirect(presignedUrl, 302);
  } catch (err) {
    console.error("Presigned URL generation failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
