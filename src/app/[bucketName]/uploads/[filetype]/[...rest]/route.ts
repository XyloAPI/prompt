import { serveR2Object } from "@/lib/r2-proxy";

export const dynamic = "force-dynamic";

/**
 * Serves R2 objects by proxying the bytes through the worker — no redirect.
 * The actual logic lives in `src/lib/r2-proxy.ts` (shared with the proxy
 * middleware which handles image requests before the Next server runs).
 */
export async function GET(
  request: Request,
  ctx: {
    params: Promise<{ bucketName: string; filetype: string; rest: string[] }>;
  }
) {
  const { bucketName, rest } = await ctx.params;
  const parts = rest.map((p) => decodeURIComponent(p));
  return serveR2Object(request, decodeURIComponent(bucketName), parts);
}