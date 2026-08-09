import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import { buildResultsWorkbook } from "@/services/reportService";

export async function GET(
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

    const test = await Test.findById(id);
    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    const attempts = await Attempt.find({ testId: id }).sort({ createdAt: -1 });
    const buffer = buildResultsWorkbook(test, attempts);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${test.testCode}-results.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Download results error:", err);
    return NextResponse.json({ success: false, message: "Failed to build report" }, { status: 500 });
  }
}