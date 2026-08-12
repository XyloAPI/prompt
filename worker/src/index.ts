/**
 * Luminaq image proxy Worker.
 *
 * Usage:
 *   https://<your-worker>.<subdomain>.workers.dev/images/<key>
 *
 * Point the bucket's "Public URL" in Admin → R2 to the worker URL, e.g.
 *   https://luminaq-images.yourname.workers.dev
 */
export interface Env {
  /** R2 binding named in wrangler.toml */
  R2_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Only serving is proxied; uploads go directly client → R2 via presigned URLs.
    if (method !== "GET" && method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const key = decodeURIComponent(url.pathname.slice(1)).replace(/^\/+/, "");
    if (!key) {
      return new Response("Not Found", { status: 404 });
    }

    const object = await env.R2_BUCKET.get(key);
    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    // Allow <next/image> and browser rendering from any origin of the app.
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(object.body, { headers });
  },
} satisfies ExportedHandler<Env>;