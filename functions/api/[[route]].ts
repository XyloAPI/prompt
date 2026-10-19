/**
 * Cloudflare Pages Function: /api/* -> mini-api worker.
 *
 * Same-origin API for the static site (no separate worker, no subdomain).
 * Wraps workers/mini-api (all routes live there) and maps Pages env names
 * onto the names the worker expects:
 *   DATABASE_URL       -> TURSO_URL
 *   TURSO_AUTH_TOKEN   -> TURSO_TOKEN
 * All other vars (ADMIN_PASSWORD, SESSION_SECRET, DEPLOY_HOOK_URL,
 * ALLOWED_ORIGIN, COOKIE_DOMAIN) are used directly as-is.
 */
import worker from "../../workers/mini-api/src";

type Ctx = {
  request: Request;
  env: Record<string, string>;
};

export async function onRequest(ctx: Ctx): Promise<Response> {
  const env = {
    ...ctx.env,
    TURSO_URL: ctx.env.TURSO_URL ?? ctx.env.DATABASE_URL ?? "",
    TURSO_TOKEN: ctx.env.TURSO_TOKEN ?? ctx.env.TURSO_AUTH_TOKEN ?? "",
  } as never;

  const url = new URL(ctx.request.url);
  url.pathname = url.pathname.replace(/^\/api(?=\/|$)/, "");
  const req = ctx.request.method === "GET" || ctx.request.method === "HEAD"
    ? new Request(url.toString(), ctx.request)
    : new Request(url.toString(), {
        method: ctx.request.method,
        headers: ctx.request.headers,
        redirect: ctx.request.redirect,
        body: ctx.request.body,
        duplex: "half",
      } as RequestInit);
  return worker.fetch(req, env);
}
