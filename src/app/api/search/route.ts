import { NextRequest } from "next/server";
import { listImages } from "@/lib/data";
import Fuse from "fuse.js";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const images = await listImages();

  let filteredImages = images;

  if (q) {
    const fuse = new Fuse(images, {
      keys: [
        { name: "title", weight: 1.0 },
        { name: "tags", weight: 0.8 },
        { name: "category", weight: 0.5 },
        { name: "description", weight: 0.4 },
        { name: "prompt", weight: 0.3 }
      ],
      threshold: 0.4,
    });
    filteredImages = fuse.search(q).map((res) => res.item);
  }

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