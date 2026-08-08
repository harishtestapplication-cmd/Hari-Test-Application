"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Breakdown {
  questionNumber: number;
  question: string;
  options: string[];
  correctOption: number;
  selectedOption: number | null;
  isCorrect: boolean;
}

interface AttemptDetail {
  studentName?: string;
  studentEmail: string;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  status: string;
}

export default function AttemptDetailPage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tests/${id}/results/${attemptId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          toast.error(data.message || "Failed to load attempt");
          return;
        }
        setAttempt(data.attempt);
        setBreakdown(data.breakdown);
      })
      .finally(() => setLoading(false));
  }, [id, attemptId]);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  if (!attempt) {
    return <div className="p-8 text-muted-foreground">Attempt not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/tests/${id}/results`)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to results
        </Button>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{attempt.studentName || attempt.studentEmail}</h1>
            <p className="text-sm text-muted-foreground">{attempt.studentEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {attempt.score}/{attempt.totalQuestions}
            </p>
            <p className="text-sm text-muted-foreground">{attempt.percentage}%</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {breakdown.map((q) => (
          <Card key={q.questionNumber}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-base font-medium leading-relaxed">
                {q.questionNumber}. {q.question}
              </CardTitle>
              <Badge className={q.isCorrect ? "bg-green-600" : "bg-red-600"}>
                {q.isCorrect ? "Correct" : "Incorrect"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((optionText, i) => {
                const optionValue = i + 1;
                const isCorrectOption = optionValue === q.correctOption;
                const isSelected = optionValue === q.selectedOption;

                return (
                  <div
                    key={optionValue}
                    className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
                      isCorrectOption
                        ? "border-green-600 bg-green-50"
                        : isSelected
                        ? "border-red-600 bg-red-50"
                        : "border-input"
                    }`}
                  >
                    {isCorrectOption && <Check className="h-4 w-4 shrink-0 text-green-600" />}
                    {isSelected && !isCorrectOption && (
                      <X className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <span>{optionText}</span>
                    {isSelected && (
                      <span className="ml-auto text-xs text-muted-foreground">Student's answer</span>
                    )}
                  </div>
                );
              })}
              {q.selectedOption === null && (
                <p className="text-xs text-muted-foreground">Not answered</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}