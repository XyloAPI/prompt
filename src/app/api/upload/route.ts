import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getFileGardenConfig } from "@/lib/filegarden";

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

    const { userId, authCookie, publicId } = await getFileGardenConfig();
    if (!userId || !authCookie) {
      return NextResponse.json(
        { error: "File Garden User ID or Auth Cookie is not configured in settings." },
        { status: 400 }
      );
    }

    // Clean up and format the Cookie header
    let cookieHeader = authCookie.trim();
    if (!cookieHeader.includes("auth=")) {
      cookieHeader = `auth=${cookieHeader}`;
    }

    const cleanUserId = userId.trim().toLowerCase();
    const cleanPublicId = publicId.trim();

    // Convert file stream to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate random UUID name preserving extension
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const randomFilename = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();

    // Call File Garden Pipe API
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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload to File Garden." },
      { status: 500 }
    );
  }
}
