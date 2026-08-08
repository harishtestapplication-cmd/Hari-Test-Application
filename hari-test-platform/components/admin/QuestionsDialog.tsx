"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpenCheck } from "lucide-react";
import { toast } from "sonner";

interface QuestionRow {
  questionNumber: number;
  question: string;
  options: string[];
  correctOption: number;
}

interface QuestionsDialogProps {
  testId: string;
  testTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Fetches the full test (including correctOption) on open and renders a
 * read-only breakdown. Reuses GET /api/tests/[id] — an admin-only, session
 * gated route — so no new endpoint is needed. Never mounted on any
 * student-facing page.
 */
export function QuestionsDialog({ testId, testTitle, open, onOpenChange }: QuestionsDialogProps) {
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/tests/${testId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          toast.error(data.message || "Failed to load questions");
          return;
        }
        const sorted = [...(data.test.questions as QuestionRow[])].sort(
          (a, b) => a.questionNumber - b.questionNumber
        );
        setQuestions(sorted);
      })
      .catch(() => toast.error("Failed to load questions"))
      .finally(() => setLoading(false));
  }, [open, testId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            Questions — {testTitle}
          </DialogTitle>
          <DialogDescription>
            {questions ? `${questions.length} question${questions.length === 1 ? "" : "s"}` : "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

        {!loading && questions && questions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No questions found.</p>
        )}

        {!loading && questions && questions.length > 0 && (
          <div className="space-y-5">
            {questions.map((q) => (
              <div key={q.questionNumber} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground">Q{q.questionNumber}.</span> {q.question}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {q.options.map((opt, idx) => {
                    const optionNumber = idx + 1;
                    const isCorrect = optionNumber === q.correctOption;
                    return (
                      <li
                        key={optionNumber}
                        className={
                          "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm " +
                          (isCorrect
                            ? "bg-green-600/10 text-green-700 dark:text-green-400"
                            : "text-muted-foreground")
                        }
                      >
                        <span>
                          {optionNumber}. {opt}
                        </span>
                        {isCorrect && (
                          <Badge className="bg-green-600 text-white">Correct</Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}