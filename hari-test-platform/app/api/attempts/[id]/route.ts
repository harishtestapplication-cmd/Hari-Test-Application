import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import { toStudentSafeTest, toShuffledStudentSafeQuestions } from "@/services/testService";
import { buildResultPayload } from "@/services/resultService";
import { findOrder, toDisplayedOption } from "@/lib/optionShuffle";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json({
        success: true,
        status: attempt.status,
        result: buildResultPayload(attempt),
      });
    }

    const test = await Test.findById(attempt.testId);
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: "in_progress",
      attemptId: attempt._id.toString(),
      actualEndTime: attempt.actualEndTime,
      test: toStudentSafeTest(test),
      questions: toShuffledStudentSafeQuestions(test, attempt.optionOrders),
      savedAnswers: attempt.answers.map((a) => {
        const order = findOrder(attempt.optionOrders, a.questionNumber);
        return {
          questionNumber: a.questionNumber,
          selectedOption: order ? toDisplayedOption(order, a.selectedOption) : a.selectedOption,
        };
      }),
    });
  } catch (err) {
    console.error("Get attempt error:", err);
    return NextResponse.json({ success: false, message: "Failed to load attempt" }, { status: 500 });
  }
}