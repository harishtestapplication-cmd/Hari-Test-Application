import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getTestByCode, toStudentSafeTest } from "@/services/testService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testCode: string }> }
) {
  try {
    const { testCode } = await params;
    await connectDB();

    const test = await getTestByCode(testCode);

    if (!test) {
      return NextResponse.json(
        { success: false, message: "Test not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, test: toStudentSafeTest(test) });
  } catch (err) {
    console.error("Get exam by code error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load test" },
      { status: 500 }
    );
  }
}