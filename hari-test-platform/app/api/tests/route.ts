import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionFromCookies } from "@/lib/auth";
import { createTestFieldsSchema } from "@/lib/validation";
import { parseQuestionsWorkbook } from "@/lib/excel";
import { createTest, listTests } from "@/services/testService";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    const rawFields = {
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      durationMinutes: formData.get("durationMinutes"),
    };

    const parsedFields = createTestFieldsSchema.safeParse(rawFields);
    if (!parsedFields.success) {
      return NextResponse.json(
        { success: false, message: parsedFields.error.issues[0].message },
        { status: 400 }
      );
    }

    const file = formData.get("questionsFile");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "An Excel (.xlsx) file of questions is required" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { success: false, message: "Only .xlsx files are accepted" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { questions, errors } = parseQuestionsWorkbook(buffer);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: "Excel validation failed", errors },
        { status: 400 }
      );
    }

    // Cross-check: duration vs window already validated on fields;
    // now confirm questions exist (schema-level min(1) not possible pre-parse)
    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid questions found in the file" },
        { status: 400 }
      );
    }

    await connectDB();
    const test = await createTest(parsedFields.data, questions, session.adminId);

    return NextResponse.json({ success: true, test }, { status: 201 });
  } catch (err) {
    console.error("Create test error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to create test" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const tests = await listTests();
    return NextResponse.json({ success: true, tests });
  } catch (err) {
    console.error("List tests error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load tests" },
      { status: 500 }
    );
  }
}