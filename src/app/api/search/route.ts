import { NextRequest } from "next/server";
import { listImages } from "@/lib/data";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const images = await listImages();

  const queryResult = {
    images: images
      .filter((i) => {
        if (!q) return true;
        return (
          i.title.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          (i.prompt ?? "").toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)) ||
          i.category.toLowerCase().includes(q)
        );
      })
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