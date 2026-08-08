import * as XLSX from "xlsx";
import { ITest, IQuestion } from "@/models/Test";
import { IAttempt } from "@/models/Attempt";
import { AdminReportStats } from "@/lib/brevo";

export function aggregateStats(attempts: IAttempt[]): AdminReportStats {
  const total = attempts.length;
  const completed = attempts.filter((a) => a.status === "submitted").length;
  const expired = attempts.filter(
    (a) => a.status === "time_expired" || a.status === "test_expired"
  ).length;

  const scored = attempts.filter((a) => typeof a.percentage === "number");
  const percentages = scored.map((a) => a.percentage as number);

  const averagePercentage =
    percentages.length > 0
      ? Math.round((percentages.reduce((sum, p) => sum + p, 0) / percentages.length) * 100) / 100
      : 0;
  const highPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;
  const lowPercentage = percentages.length > 0 ? Math.min(...percentages) : 0;

  return {
    totalAttempts: total,
    completed,
    expired,
    averagePercentage,
    highPercentage,
    lowPercentage,
  };
}

/**
 * Used identically by the admin's on-demand download AND Phase 13's cron
 * job email attachment — same function, one source of truth for the sheet.
 */
export function buildResultsWorkbook(test: ITest, attempts: IAttempt[]): Buffer {
  const rows = attempts.map((a) => ({
    "Student Name": a.studentName || "",
    Email: a.studentEmail,
    "Test Name": test.title,
    "Started At": a.startedAt ? a.startedAt.toISOString() : "",
    "Submitted At": a.submittedAt ? a.submittedAt.toISOString() : "",
    Score: a.score ?? "",
    "Total Questions": a.totalQuestions ?? "",
    Percentage: a.percentage ?? "",
    Correct: a.correctAnswers ?? "",
    Wrong: a.wrongAnswers ?? "",
    Unanswered: a.unanswered ?? "",
    Status: a.status,
    "Submission Type": a.submissionType ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export interface AttemptQuestionBreakdown {
  questionNumber: number;
  question: string;
  options: string[];
  correctOption: number;
  selectedOption: number | null;
  isCorrect: boolean;
}

/**
 * This is the ONE place correctOption is allowed to reach a response body —
 * the admin per-attempt detail route. Never call this for student-facing code.
 */
export function buildAttemptDetail(test: ITest, attempt: IAttempt): AttemptQuestionBreakdown[] {
  const sortedQuestions = [...test.questions].sort(
    (a: IQuestion, b: IQuestion) => a.questionNumber - b.questionNumber
  );

  return sortedQuestions.map((q) => {
    const given = attempt.answers.find((a) => a.questionNumber === q.questionNumber);
    const selectedOption = given ? given.selectedOption : null;

    return {
      questionNumber: q.questionNumber,
      question: q.question,
      options: q.options,
      correctOption: q.correctOption,
      selectedOption,
      isCorrect: selectedOption !== null && selectedOption === q.correctOption,
    };
  });
}