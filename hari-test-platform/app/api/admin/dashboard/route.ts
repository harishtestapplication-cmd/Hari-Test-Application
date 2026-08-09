import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import { deriveTestStatus } from "@/lib/exam";

/**
 * Single aggregation endpoint for the admin dashboard: test counts by
 * derived status, attempt totals/average, and small recent/live slices.
 * derivedStatus is never persisted — always computed here from current
 * server time, same as everywhere else in the app.
 */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const tests = await Test.find().sort({ createdAt: -1 }).lean();
    const testsWithStatus = tests.map((t) => ({
      ...t,
      derivedStatus: deriveTestStatus(t.startTime, t.endTime),
    }));

    const upcoming = testsWithStatus.filter((t) => t.derivedStatus === "UPCOMING").length;
    const live = testsWithStatus.filter((t) => t.derivedStatus === "LIVE").length;
    const ended = testsWithStatus.filter((t) => t.derivedStatus === "ENDED").length;

    const totalAttempts = await Attempt.countDocuments();

    const scoredAttempts = await Attempt.find({
      percentage: { $exists: true, $ne: null },
    }).select("percentage");
    const averagePercentage =
      scoredAttempts.length > 0
        ? Math.round(
            (scoredAttempts.reduce((sum, a) => sum + (a.percentage as number), 0) /
              scoredAttempts.length) *
              100
          ) / 100
        : 0;

    const recentTests = testsWithStatus.slice(0, 5).map((t) => ({
      id: t._id.toString(),
      title: t.title,
      testCode: t.testCode,
      derivedStatus: t.derivedStatus,
      createdAt: t.createdAt,
    }));

    const liveTests = testsWithStatus
      .filter((t) => t.derivedStatus === "LIVE")
      .slice(0, 10)
      .map((t) => ({
        id: t._id.toString(),
        title: t.title,
        testCode: t.testCode,
        startTime: t.startTime,
        endTime: t.endTime,
      }));

    const recentResultsRaw = await Attempt.find({ status: { $ne: "in_progress" } })
      .sort({ submittedAt: -1 })
      .limit(8)
      .populate("testId", "title testCode");

    const recentResults = recentResultsRaw.map((a) => {
      const test = a.testId as unknown as { _id: unknown; title: string; testCode: string } | null;
      return {
        attemptId: a._id.toString(),
        testId: test ? String(test._id) : null,
        testTitle: test?.title ?? "Untitled test",
        studentName: a.studentName,
        studentEmail: a.studentEmail,
        percentage: a.percentage,
        status: a.status,
        submittedAt: a.submittedAt,
      };
    });

    return NextResponse.json({
      success: true,
      counts: {
        totalTests: testsWithStatus.length,
        upcoming,
        live,
        ended,
      },
      totalAttempts,
      averagePercentage,
      recentTests,
      liveTests,
      recentResults,
    });
  } catch (err) {
    console.error("Dashboard aggregation error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}