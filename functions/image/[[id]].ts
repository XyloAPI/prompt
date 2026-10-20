import { handleAssetPage } from "../_shared/asset-page";

export async function onRequest(ctx: {
  request: Request;
  env: Record<string, string> & { ASSETS?: { fetch: (req: Request) => Promise<Response> } };
}): Promise<Response> {
  return handleAssetPage(ctx);
}
