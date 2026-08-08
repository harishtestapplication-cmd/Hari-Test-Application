import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { startAttempt, StartAttemptError } from "@/services/attemptService";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const startAttemptSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().email("Enter a valid email"),
});

// Generous enough for real students retrying a flaky connection / refreshing,
// tight enough to blunt a script hammering start() to brute-force emails
// or spam duplicate-attempt errors against the DB.
const START_LIMIT = 10;
const START_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ testCode: string }> }
) {
  try {
    const { testCode } = await params;

    const ip = getClientIp(req);
    const { allowed, resetAt } = rateLimit(
      `exam-start:${ip}:${testCode}`,
      START_LIMIT,
      START_WINDOW_MS
    );
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await req.json();
    const parsed = startAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    const result = await startAttempt(testCode, parsed.data.email, parsed.data.name);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StartAttemptError) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.status }
      );
    }
    console.error("Start attempt error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to start the test" },
      { status: 500 }
    );
  }
}