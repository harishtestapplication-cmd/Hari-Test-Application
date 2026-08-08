import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import { patchAnswerSchema } from "@/lib/validation";
import { finalizeAttempt } from "@/services/resultService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchAnswerSchema.safeParse(body);

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

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { success: false, message: "This attempt has already been finalized." },
        { status: 409 }
      );
    }

    const now = new Date();
    if (now >= attempt.actualEndTime) {
      const test = await Test.findById(attempt.testId);
      if (!test) {
        return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
      }
      const submissionType =
        attempt.actualEndTime.getTime() === test.endTime.getTime()
          ? "test_window_expired"
          : "duration_expired";

      await finalizeAttempt(test, attempt, submissionType);

      return NextResponse.json(
        { success: false, message: "Time has expired for this test.", expired: true },
        { status: 409 }
      );
    }

    const { questionNumber, selectedOption } = parsed.data;
    const existingIndex = attempt.answers.findIndex((a) => a.questionNumber === questionNumber);
    if (existingIndex >= 0) {
      attempt.answers[existingIndex].selectedOption = selectedOption as 1 | 2 | 3 | 4;
    } else {
      attempt.answers.push({ questionNumber, selectedOption: selectedOption as 1 | 2 | 3 | 4 });
    }
    attempt.markModified("answers");
    await attempt.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Autosave answer error:", err);
    return NextResponse.json({ success: false, message: "Failed to save answer" }, { status: 500 });
  }
}