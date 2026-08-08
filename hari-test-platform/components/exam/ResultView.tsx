import { SiteBrand } from "@/components/common/SiteBrand";

export interface ResultPayload {
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalQuestions: number;
  percentage: number;
  status: string;
  submissionType: string;
  studentEmail: string;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  time_expired: "Time expired",
  test_expired: "Test window closed",
};

export function ResultView({ result }: { result: ResultPayload }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <SiteBrand className="mb-6" />
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold">
          {STATUS_LABELS[result.status] ?? "Test submitted"}
        </h2>
        <div className="mt-4 space-y-1 text-muted-foreground">
          <p className="text-3xl font-bold text-foreground">
            {result.correctAnswers} / {result.totalQuestions}
          </p>
          <p>{result.percentage}% correct</p>
          <p className="text-sm">
            {result.wrongAnswers} wrong · {result.unanswered} unanswered
          </p>
          <p className="mt-3 text-sm">Sent to {result.studentEmail}.</p>
        </div>
      </div>
    </div>
  );
}