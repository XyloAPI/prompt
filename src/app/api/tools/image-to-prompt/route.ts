import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image, language = "en", model = "general" } = await req.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Image data is required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.imagepromptguru.net/image-to-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://imagepromptguru.net",
        "Referer": "https://imagepromptguru.net/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        image,
        language,
        model,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: `API error: ${response.status} - ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Image to Prompt Proxy Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
