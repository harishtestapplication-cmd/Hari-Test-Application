import { notFound } from "next/navigation";
import { ExamFlow } from "@/components/exam/ExamFlow";

async function fetchTest(testCode: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${appUrl}/api/exams/${testCode}`, { cache: "no-store" });
  const data = await res.json();
  return data;
}

export default async function ExamLandingPage({
  params,
}: {
  params: Promise<{ testCode: string }>;
}) {
  const { testCode } = await params;
  const data = await fetchTest(testCode);

  if (!data.success) {
    notFound();
  }

  return <ExamFlow initialTest={data.test} />;
}