import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth";
import { getTestById, deleteTestById, DeleteTestError } from "@/services/testService";

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
    const test = await getTestById(id);

    if (!test) {
      return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, test });
  } catch (err) {
    console.error("Get test error:", err);
    return NextResponse.json({ success: false, message: "Failed to load test" }, { status: 500 });
  }
}

export async function DELETE(
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
    await deleteTestById(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof DeleteTestError) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.status }
      );
    }
    console.error("Delete test error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete test" },
      { status: 500 }
    );
  }
}