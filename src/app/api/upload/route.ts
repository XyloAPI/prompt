import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getFileGardenConfig } from "@/lib/filegarden";
import { getImgCdnConfig } from "@/lib/imgcdn";
import { getSetting } from "@/db/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const provider = (await getSetting("storage_provider")) || "filegarden";

    if (provider === "imgcdn") {
      return await uploadToImgCdn(file);
    } else {
      return await uploadToFileGarden(file);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}

// ─── File Garden ─────────────────────────────────────────────────────────────

async function uploadToFileGarden(file: File): Promise<NextResponse> {
  const { userId, authCookie, publicId } = await getFileGardenConfig();
  if (!userId || !authCookie) {
    return NextResponse.json(
      { error: "File Garden User ID or Auth Cookie is not configured in settings." },
      { status: 400 }
    );
  }

  let cookieHeader = authCookie.trim();
  if (!cookieHeader.includes("auth=")) {
    cookieHeader = `auth=${cookieHeader}`;
  }

  const cleanUserId = userId.trim().toLowerCase();
  const cleanPublicId = publicId.trim();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const randomFilename = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();

  const res = await fetch(`https://api.filegarden.com/users/${cleanUserId}/pipe`, {
    method: "POST",
    headers: {
      "Cookie": cookieHeader,
      "Content-Type": "application/octet-stream",
      "X-Data": JSON.stringify({ parent: null, name: randomFilename }),
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `File Garden upload failed (${res.status}): ${text || res.statusText}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  console.log("File Garden API response data:", data);

  const path = data?.path || data?.items?.[0]?.path;
  if (!path) {
    return NextResponse.json(
      { error: `Invalid response from File Garden (missing path). Raw response: ${JSON.stringify(data)}` },
      { status: 500 }
    );
  }

  const publicUrl = `https://file.garden/${cleanPublicId}/${path}`;
  return NextResponse.json({ url: publicUrl });
}

// ─── ImgCDN.dev ──────────────────────────────────────────────────────────────

async function uploadToImgCdn(file: File): Promise<NextResponse> {
  const { apiKey } = await getImgCdnConfig();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ImgCDN API key is not configured in settings." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Append a random 16-byte salt so the content hash is always unique.
  // JPEG/PNG/WebP viewers ignore trailing data after their end marker (FFD9 / IEND),
  // so the image renders normally but ImgCDN never triggers a 101 duplicate error.
  const salt = Buffer.from(crypto.randomUUID().replace(/-/g, ""), "hex");
  const uniqueBuffer = Buffer.concat([buffer, salt]);

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const randomFilename = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();

  const uploadForm = new FormData();
  uploadForm.append("key", apiKey);
  uploadForm.append("action", "upload");
  uploadForm.append(
    "source",
    new Blob([uniqueBuffer], { type: file.type || "image/jpeg" }),
    randomFilename
  );

  const res = await fetch("https://imgcdn.dev/api/1/upload", {
    method: "POST",
    body: uploadForm,
  });

  const data = await res.json().catch(() => null);
  console.log("ImgCDN API response data:", data);

  if (!res.ok) {
    // Fallback: if somehow 101 still fires, try to extract the existing image URL.
    const errorCode = data?.error?.code ?? data?.status_code;
    const existingUrl = data?.image?.url || data?.image?.display_url;
    if (errorCode === 101 && existingUrl) {
      return NextResponse.json({ url: existingUrl });
    }

    const message = data?.error?.message || data?.message || res.statusText;
    return NextResponse.json(
      { error: `ImgCDN upload failed (${res.status}): ${message}` },
      { status: res.status }
    );
  }

  // Chevereto API v1 response shape: { status_code: 200, success: { message, code }, image: { url, ... } }
  const imageUrl = data?.image?.url || data?.image?.display_url;
  if (!imageUrl) {
    return NextResponse.json(
      { error: `Invalid response from ImgCDN (missing image URL). Raw: ${JSON.stringify(data)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: imageUrl });
}
