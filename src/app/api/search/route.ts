import { NextRequest } from "next/server";
import { listImages } from "@/lib/data";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  // Push filtering + limiting down to SQL. Running Fuse over the full
  // table per request was a major CPU hotspot in the worker.
  const images = await listImages(q ? { search: q, limit: 50 } : { limit: 50 });

  const filteredImages = images;

  const queryResult = {
    images: filteredImages
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        thumbnailUrl: i.thumbnailUrl,
      })),
    total: images.length,
  };

  return Response.json(queryResult);
}