import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import { buildAttemptDetail } from "@/services/reportService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, attemptId } = await params;
    await connectDB();

    const test = await Test.findById(id);
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, testId: id });
    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt._id.toString(),
        studentName: attempt.studentName,
        studentEmail: attempt.studentEmail,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        status: attempt.status,
        submissionType: attempt.submissionType,
      },
      breakdown: buildAttemptDetail(test, attempt),
    });
  } catch (err) {
    console.error("Get attempt detail error:", err);
    return NextResponse.json({ success: false, message: "Failed to load attempt" }, { status: 500 });
  }
}