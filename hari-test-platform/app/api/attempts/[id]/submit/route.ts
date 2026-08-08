import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import { submitAttemptSchema } from "@/lib/validation";
import { finalizeAttempt, buildResultPayload } from "@/services/resultService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = submitAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();
    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt not found" }, { status: 404 });
    }

    const test = await Test.findById(attempt.testId);
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    // Idempotent: retry, double-click, or duplicate submit -> return existing result, no error.
    if (attempt.status !== "in_progress") {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        result: buildResultPayload(attempt),
      });
    }

    const now = new Date();
    const stillInTime = now < attempt.actualEndTime;

    // Server recomputes the authoritative type — the client's submissionType is never trusted.
    const submissionType = stillInTime
      ? "manual"
      : attempt.actualEndTime.getTime() === test.endTime.getTime()
      ? "test_window_expired"
      : "duration_expired";

    // Late answer payloads are ignored — score whatever was already autosaved.
    const mergeAnswers = stillInTime ? parsed.data.answers : undefined;

    await finalizeAttempt(test, attempt, submissionType, mergeAnswers);

    return NextResponse.json({ success: true, result: buildResultPayload(attempt) });
  } catch (err) {
    console.error("Submit attempt error:", err);
    return NextResponse.json({ success: false, message: "Failed to submit test" }, { status: 500 });
  }
}