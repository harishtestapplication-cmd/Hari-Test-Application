import { notFound } from "next/navigation";
import { ExamFlow } from "@/components/exam/ExamFlow";
import { connectDB } from "@/lib/mongodb";
import { getTestByCode, toStudentSafeTest } from "@/services/testService";

export default async function ExamLandingPage({
  params,
}: {
  params: Promise<{ testCode: string }>;
}) {
  const { testCode } = await params;

  await connectDB();
  const test = await getTestByCode(testCode);

  if (!test) {
    notFound();
  }

  return <ExamFlow initialTest={toStudentSafeTest(test)} />;
}