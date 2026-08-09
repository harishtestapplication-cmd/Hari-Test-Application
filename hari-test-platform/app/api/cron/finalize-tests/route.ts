import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import { finalizeAttempt } from "@/services/resultService";
import { aggregateStats, buildResultsWorkbook } from "@/services/reportService";
import { sendAdminFinalReportEmail } from "@/lib/brevo";

/**
 * Sweeps for tests whose window has closed and:
 *   1. finalizes any attempts a student left `in_progress` (browser closed,
 *      never came back — nothing else would ever touch these),
 *   2. builds the results workbook from ALL attempts (same builder the
 *      admin's on-demand Excel download uses — one source of truth),
 *   3. emails the admin exactly once, guarded by an atomic
 *      claim-then-send compare-and-swap on `reportSent` so a duplicate
 *      or overlapping cron tick can never double-send.
 *
 * Auth: Vercel Cron (or a manual curl) must send
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("finalize-tests: CRON_SECRET is not configured");
    return NextResponse.json({ success: false, message: "Not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();
    const dueTests = await Test.find({ endTime: { $lte: now }, reportSent: false });

    let finalizedAttempts = 0;
    let reportsSent = 0;

    for (const test of dueTests) {
      // 1. Finalize any attempts still in_progress for this ended test.
      const stale = await Attempt.find({ testId: test._id, status: "in_progress" });
      for (const attempt of stale) {
        const submissionType =
          attempt.actualEndTime.getTime() === test.endTime.getTime()
            ? "test_window_expired"
            : "duration_expired";
        try {
          await finalizeAttempt(test, attempt, submissionType);
          finalizedAttempts++;
        } catch (err) {
          console.error(`finalize-tests: failed to finalize attempt ${attempt._id}:`, err);
          // Don't let one bad attempt block the rest of this test's finalization.
        }
      }

      // 2. Build the report from ALL attempts, fresh from DB now that
      //    stale ones above are finalized.
      const allAttempts = await Attempt.find({ testId: test._id });
      const stats = aggregateStats(allAttempts);
      const buffer = buildResultsWorkbook(test, allAttempts);

      // 3. Claim-then-send: atomic compare-and-swap on reportSent=false.
      //    If another cron run already claimed it, this returns null and
      //    we skip sending — guarantees at-most-one admin email per test.
      const claimed = await Test.findOneAndUpdate(
        { _id: test._id, reportSent: false },
        { $set: { reportSent: true } }
      );
      if (!claimed) continue;

      const sent = await sendAdminFinalReportEmail(test, stats, buffer);
      if (sent) reportsSent++;
      // If the email failed, reportSent is already true (claimed above) —
      // matching the spec's design: never send a duplicate, retry is manual
      // via the admin's on-demand Excel download instead.
    }

    return NextResponse.json({
      success: true,
      processedTests: dueTests.length,
      finalizedAttempts,
      reportsSent,
    });
  } catch (err) {
    console.error("finalize-tests cron error:", err);
    return NextResponse.json({ success: false, message: "Failed to run finalization" }, { status: 500 });
  }
}