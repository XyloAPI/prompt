import { NextResponse } from "next/server";
import { errorLogs } from "@/db/schema";
import * as query from "@/db/queries";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.message) {
      return NextResponse.json({ error: "Invalid payload (message is required)" }, { status: 400 });
    }

    const { message, stack, url, userAgent } = body;

    const newLog = {
      message: String(message).slice(0, 1000),
      stack: stack ? String(stack).slice(0, 5000) : "",
      url: url ? String(url).slice(0, 2000) : "",
      userAgent: userAgent ? String(userAgent).slice(0, 500) : "",
      status: "unresolved" as const,
      createdAt: new Date().toISOString(),
    };

    if (await query.hasDb()) {
      const db = (await import("@/db")).db;
      await db.insert(errorLogs).values(newLog);
    } else {
      console.warn("DB offline. Local error logged to console:", newLog);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reporting error failed." },
      { status: 500 }
    );
  }
}
