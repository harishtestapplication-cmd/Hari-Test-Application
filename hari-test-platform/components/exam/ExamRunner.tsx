"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ExamHeader } from "./ExamHeader";
import { QuestionCard } from "./QuestionCard";
import { QuestionPalette } from "./QuestionPalette";
import { Navigation } from "./Navigation";
import { SubmitBar } from "./SubmitBar";
import { ResultView, type ResultPayload } from "./ResultView";
import { TabSwitchWarningDialog, TabSwitchAutoSubmitDialog } from "./ProctoringDialogs";
import type { StudentSafeQuestion } from "./ExamFlow";

interface ExamRunnerProps {
  attemptId: string;
  testTitle: string;
  actualEndTime: string; // ISO
  questions: StudentSafeQuestion[];
  savedAnswers: { questionNumber: number; selectedOption: number }[];
}

type SubmissionType = "manual" | "duration_expired" | "test_window_expired";

const MAX_TAB_SWITCHES = 3;

export function ExamRunner({
  attemptId,
  testTitle,
  actualEndTime,
  questions,
  savedAnswers,
}: ExamRunnerProps) {
  const sortedQuestions = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);

  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const a of savedAnswers) initial[a.questionNumber] = a.selectedOption;
    return initial;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [msRemaining, setMsRemaining] = useState(() =>
    new Date(actualEndTime).getTime() - Date.now()
  );
  const [locked, setLocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const hasFinalized = useRef(false);

  // --- Tab-switch proctoring ---
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showAutoSubmitNotice, setShowAutoSubmitNotice] = useState(false);
  const wasHiddenRef = useRef(false);

  const handleSubmit = useCallback(
    async (submissionType: SubmissionType) => {
      if (hasFinalized.current) return;
      hasFinalized.current = true;
      setLocked(true); // lock UI immediately, don't wait on the network

      try {
        const res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: Object.entries(answers).map(([qNo, opt]) => ({
              questionNumber: Number(qNo),
              selectedOption: opt,
            })),
            submissionType,
          }),
        });
        const data = await res.json();
        if (data.success && data.result) {
          setResult(data.result as ResultPayload);
        }
      } catch {
        // Network failure on submit: UI stays locked/submitted locally.
        // A subsequent refresh will reconcile via GET /api/attempts/[id].
      }

      setSubmitted(true);
    },
    [attemptId, answers]
  );

  const reportViolation = useCallback(async () => {
    if (hasFinalized.current) return;

    try {
      const res = await fetch(`/api/attempts/${attemptId}/violation`, { method: "POST" });
      const data = await res.json();
      if (!data.success) return;

      setViolationCount(data.tabSwitchCount ?? 0);

      if (data.autoSubmitted) {
        hasFinalized.current = true;
        setLocked(true);
        if (data.result) setResult(data.result as ResultPayload);
        setSubmitted(true);
        setShowAutoSubmitNotice(true);
      } else {
        setShowWarning(true);
      }
    } catch {
      // Best-effort — if this fails silently, the next tab switch tries again.
      // The server is still the source of truth for the actual count.
    }
  }, [attemptId]);

  // Detect leaving-and-returning to this tab. We only act on the RETURN
  // (visible again after having been hidden) — that's when the student can
  // actually see an alert, and it matches "warn them when they get back."
  useEffect(() => {
    function handleVisibilityChange() {
      if (submitted || locked) return;

      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
      } else if (document.visibilityState === "visible" && wasHiddenRef.current) {
        wasHiddenRef.current = false;
        reportViolation();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [submitted, locked, reportViolation]);

  // Timer: recompute from actualEndTime every 500ms, never from durationMinutes directly.
  useEffect(() => {
    if (submitted) return;

    const interval = setInterval(() => {
      const remaining = new Date(actualEndTime).getTime() - Date.now();
      setMsRemaining(remaining);

      if (remaining <= 0 && !hasFinalized.current) {
        clearInterval(interval);
        handleSubmit("duration_expired");
      }
    }, 500);

    return () => clearInterval(interval);
  }, [actualEndTime, submitted, handleSubmit]);

  async function handleSelect(questionNumber: number, option: number) {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [questionNumber]: option }));

    try {
      const res = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionNumber, selectedOption: option }),
      });

      if (res.status === 409 && !hasFinalized.current) {
        // Server already finalized this attempt (time ran out mid-request).
        hasFinalized.current = true;
        setLocked(true);
        setSubmitted(true);
      }
    } catch {
      // Best-effort autosave — a failed PATCH doesn't block the local UI.
    }
  }

  const currentQuestion = sortedQuestions[currentIndex];
  const answeredNumbers = new Set(Object.keys(answers).map(Number));

  return (
    <>
      {submitted ? (
        result ? (
          <ResultView result={result} />
        ) : (
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="max-w-md text-center">
              <h2 className="text-xl font-semibold">Test submitted</h2>
              <p className="mt-2 text-muted-foreground">
                Your answers have been recorded. Refresh this page for your score.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="min-h-screen bg-muted/20 pb-8">
          <ExamHeader title={testTitle} msRemaining={msRemaining} />

          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            <QuestionCard
              question={currentQuestion}
              index={currentIndex}
              total={sortedQuestions.length}
              selectedOption={answers[currentQuestion.questionNumber]}
              onSelect={(option) => handleSelect(currentQuestion.questionNumber, option)}
              disabled={locked}
            />

            <Navigation
              currentIndex={currentIndex}
              total={sortedQuestions.length}
              onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              onNext={() =>
                setCurrentIndex((i) => Math.min(sortedQuestions.length - 1, i + 1))
              }
              disabled={locked}
            />

            <QuestionPalette
              questionNumbers={sortedQuestions.map((q) => q.questionNumber)}
              answeredNumbers={answeredNumbers}
              currentIndex={currentIndex}
              onJump={setCurrentIndex}
              disabled={locked}
            />

            <SubmitBar
              answeredCount={answeredNumbers.size}
              totalCount={sortedQuestions.length}
              onConfirmSubmit={() => handleSubmit("manual")}
              disabled={locked}
            />
          </div>
        </div>
      )}

      <TabSwitchWarningDialog
        open={showWarning}
        violationCount={violationCount}
        maxViolations={MAX_TAB_SWITCHES}
        onAcknowledge={() => setShowWarning(false)}
      />
      <TabSwitchAutoSubmitDialog
        open={showAutoSubmitNotice}
        onAcknowledge={() => setShowAutoSubmitNotice(false)}
      />
    </>
  );
}