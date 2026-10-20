/**
 * Shared handler for the live asset pages (/image/<id>, /video/<id>, /sfx/<id>).
 *
 * Assets are hosted immediately after upload — no rebuild. The function:
 *   1. serves the prerendered page when it exists (fast path, static asset),
 *   2. otherwise renders the asset live from the database and returns it as
 *      a real HTML page (status 200) with the data embedded, so the page is
 *      crawlable and visible without any client-side fetch.
 */
import { fetchImageById, type Env } from "../../workers/mini-api/src";

type Ctx = {
  request: Request;
  env: Record<string, string> & { ASSETS?: { fetch: (req: Request) => Promise<Response> } };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function withEnv(env: Record<string, string>): Env {
  return {
    ...env,
    TURSO_URL: env.TURSO_URL ?? env.DATABASE_URL ?? "",
    TURSO_TOKEN: env.TURSO_TOKEN ?? env.TURSO_AUTH_TOKEN ?? "",
  } as never;
}

export async function handleAssetPage(ctx: Ctx): Promise<Response> {
  const url = new URL(ctx.request.url);
  const id = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  const assets = ctx.env.ASSETS;

  // Prerendered page (and its RSC payloads) exist -> serve them untouched.
  if (assets) {
    const staticUrl = new URL(url.pathname + url.search, url.origin);
    const staticRes = await assets.fetch(new Request(staticUrl.toString(), ctx.request));
    if (staticRes.status === 200) return staticRes;
  }

  const image = await fetchImageById(withEnv(ctx.env), id);

  const html = await fetchShell(url.origin, ctx.request, assets);

  if (!image) {
    return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const title = escapeHtml(image.title);
  const description = escapeHtml(image.description || `Browse and download "${image.title}" on Luminaq.`);
  const shareImg = escapeHtml(image.thumbnailUrl || image.url);
  const isAudio = image.category === "sfx";

  const page = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title} · Luminaq</title>`)
    .replace(
      "</head>",
      `<meta name="description" content="${description}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
${isAudio ? "" : `<meta property="og:image" content="${shareImg}" />`}
<meta property="og:type" content="website" />
<script>window.__LIVE_ASSET__=${JSON.stringify(image).replace(/</g, "\\u003c")};</script>
</head>`
    );

  return new Response(page, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Pages normalizes /404.html with a 308 and the ASSETS binding does not follow
 * redirects, so the redirect body would be empty. Fetch /404 directly and keep
 * a minimal document as a last resort: the route must never answer an empty 200.
 */
async function fetchShell(
  origin: string,
  request: Request,
  assets: Ctx["env"]["ASSETS"]
): Promise<string> {
  if (assets) {
    for (const path of ["/404", "/404.html"]) {
      const res = await assets.fetch(new Request(new URL(path, origin).toString(), request));
      if (res.status !== 200) continue;
      const html = await res.text();
      if (html.includes("</head>")) return html;
    }
  }
  return '<!doctype html><html><head><meta charset="utf-8"><title>Luminaq</title></head><body></body></html>';
}
