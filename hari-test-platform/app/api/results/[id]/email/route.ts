import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import { sendStudentResultEmail } from "@/lib/brevo";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return NextResponse.json({ success: false, message: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status === "in_progress") {
      return NextResponse.json(
        { success: false, message: "This attempt hasn't been submitted yet." },
        { status: 409 }
      );
    }

    const test = await Test.findById(attempt.testId);
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    // Re-sends the already-calculated result. Never recomputes the score.
    const sent = await sendStudentResultEmail(test, attempt);
    if (sent !== attempt.resultEmailSent) {
      attempt.resultEmailSent = sent;
      await attempt.save();
    }

    if (!sent) {
      return NextResponse.json(
        { success: false, message: "Email failed to send. Check Brevo configuration." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Resend email error:", err);
    return NextResponse.json({ success: false, message: "Failed to resend email" }, { status: 500 });
  }
}