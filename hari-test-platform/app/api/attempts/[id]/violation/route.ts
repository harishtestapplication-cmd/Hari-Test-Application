import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import { finalizeAttempt, buildResultPayload } from "@/services/resultService";

const MAX_TAB_SWITCHES = 3;

/**
 * Called once each time the student returns to this tab after having left
 * it. Counted and persisted server-side (never trust a client-held count —
 * a refresh must not reset it). At MAX_TAB_SWITCHES the attempt is
 * force-finalized here, the same way a timer expiry is.
 */
export async function POST(
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
      // Already finalized (by the timer, a manual submit, or an earlier
      // violation) — nothing new to record, just report where things stand.
      return NextResponse.json({
        success: true,
        tabSwitchCount: attempt.tabSwitchCount ?? 0,
        autoSubmitted: true,
        result: buildResultPayload(attempt),
      });
    }

    const test = await Test.findById(attempt.testId);
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    const now = new Date();
    if (now >= attempt.actualEndTime) {
      const submissionType =
        attempt.actualEndTime.getTime() === test.endTime.getTime()
          ? "test_window_expired"
          : "duration_expired";
      await finalizeAttempt(test, attempt, submissionType);
      return NextResponse.json({
        success: true,
        tabSwitchCount: attempt.tabSwitchCount ?? 0,
        autoSubmitted: true,
        result: buildResultPayload(attempt),
      });
    }

    attempt.tabSwitchCount = (attempt.tabSwitchCount ?? 0) + 1;

    if (attempt.tabSwitchCount >= MAX_TAB_SWITCHES) {
      await finalizeAttempt(test, attempt, "tab_switch_violation");
      return NextResponse.json({
        success: true,
        tabSwitchCount: attempt.tabSwitchCount,
        autoSubmitted: true,
        result: buildResultPayload(attempt),
      });
    }

    await attempt.save();

    return NextResponse.json({
      success: true,
      tabSwitchCount: attempt.tabSwitchCount,
      autoSubmitted: false,
    });
  } catch (err) {
    console.error("Record violation error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to record violation" },
      { status: 500 }
    );
  }
}