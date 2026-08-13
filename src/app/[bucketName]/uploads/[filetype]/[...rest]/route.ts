import { getR2BucketByName, getR2Accounts } from "@/db/queries";
import { getObjectSize, createPresignedDownloadUrl } from "@/lib/r2";
import type { R2Account } from "@/db/schema";

export const dynamic = "force-dynamic";

async function checkExists(opts: {
  account: R2Account;
  bucketName: string;
  key: string;
}): Promise<boolean> {
  try {
    await getObjectSize(opts);
    return true;
  } catch {
    return false;
  }
}

/**
 * Redirects to R2 presigned URLs.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
 */
export async function GET(
  request: Request,
  ctx: {
    params: Promise<{ bucketName: string; filetype: string; rest: string[] }>;
  }
) {
  const { bucketName, filetype, rest } = await ctx.params;
  const parts = rest.map((p) => decodeURIComponent(p));
  if (parts.length === 0 || parts.some((p) => !p || p.includes(".."))) {
    return new Response("Bad Request", { status: 400 });
  }

  const bucket = await getR2BucketByName(decodeURIComponent(bucketName));
  if (!bucket) return new Response("Not Found", { status: 404 });
  const account = (await getR2Accounts()).find((a) => a.id === bucket.accountId);
  if (!account) return new Response("Not Found", { status: 404 });

  const primaryKey = `images/${parts.join("/")}`;
  let resolvedKey = "";

  // Check if primary key exists
  if (await checkExists({ account, bucketName: bucket.name, key: primaryKey })) {
    resolvedKey = primaryKey;
  }

  if (!resolvedKey) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    // Generate presigned GET url and redirect to it (valid for 1 hour)
    const presignedUrl = await createPresignedDownloadUrl({
      account,
      bucketName: bucket.name,
      key: resolvedKey,
      expiresIn: 3600,
    });

    return Response.redirect(presignedUrl, 302);
  } catch (err) {
    console.error("Presigned URL generation failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
