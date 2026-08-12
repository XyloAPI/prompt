import { getR2BucketByName, getR2Accounts } from "@/db/queries";
import { getObjectBuffer } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Serves images from R2.
 * - Master:  /<bucket>/uploads/<filetype>/<slug>            → key `images/<slug>`
 * - Preview: /<bucket>/uploads/<filetype>/preview/<slug>    → key `images/preview/<slug>`
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

  const primaryKey = `images/${parts.join("/")}`;

  let bytes: Buffer | null = null;
  let contentType = "application/octet-stream";
  let resolvedKey = primaryKey;

  // Try primary key
  try {
    const res = await getObjectBuffer({ account, bucketName: bucket.name, key: primaryKey });
    bytes = res.bytes;
    contentType = res.contentType || "application/octet-stream";
  } catch {
    // If preview key failed, fallback to master key
    if (primaryKey.includes("/preview/")) {
      const fallbackKey = primaryKey.replace("/preview/", "/");
      try {
        const res = await getObjectBuffer({ account, bucketName: bucket.name, key: fallbackKey });
        bytes = res.bytes;
        contentType = res.contentType || "application/octet-stream";
        resolvedKey = fallbackKey;
      } catch {}
    }

    // Try alternate extension fallback (e.g. .mp4 vs .jpg)
    if (!bytes) {
      const extMatch = primaryKey.match(/\.[a-z0-9]+$/i);
      const altExts = [".mp4", ".jpg", ".png", ".webp", ".webm", ".mov"];
      for (const alt of altExts) {
        if (extMatch && extMatch[0].toLowerCase() === alt) continue;
        const testKey = extMatch
          ? primaryKey.slice(0, -extMatch[0].length) + alt
          : primaryKey + alt;
        try {
          const res = await getObjectBuffer({ account, bucketName: bucket.name, key: testKey });
          bytes = res.bytes;
          contentType = res.contentType || "application/octet-stream";
          resolvedKey = testKey;
          break;
        } catch {}
      }
    }
  }

  if (!bytes) {
    return new Response("Not Found", { status: 404 });
  }

  // Deduce content type if missing or octet-stream
  if (contentType === "application/octet-stream" || !contentType) {
    const ext = resolvedKey.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
    };
    if (ext && mimeMap[ext]) {
      contentType = mimeMap[ext];
    }
  }

  const totalLength = bytes.byteLength;
  const rangeHeader = request.headers.get("range");

  // Handle Range request for video streaming
  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const rangeParts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(rangeParts[0], 10) || 0;
    const end = rangeParts[1] ? parseInt(rangeParts[1], 10) : totalLength - 1;

    if (start < totalLength && end < totalLength && start <= end) {
      const chunk = bytes.subarray(start, end + 1);
      return new Response(new Uint8Array(chunk), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${totalLength}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunk.byteLength),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(totalLength),
    },
  });
}
