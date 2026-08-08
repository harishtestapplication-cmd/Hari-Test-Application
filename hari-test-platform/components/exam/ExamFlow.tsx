"use client";

import { useEffect, useState } from "react";
import { ExamLanding, type StudentSafeTest } from "./ExamLanding";
import { ExamRunner } from "./ExamRunner";
import { ResultView, type ResultPayload } from "./ResultView";

export interface StudentSafeQuestion {
  questionNumber: number;
  question: string;
  options: string[];
}

export interface StartAttemptResponse {
  success: true;
  attemptId: string;
  actualEndTime: string;
  test: StudentSafeTest;
  questions: StudentSafeQuestion[];
  savedAnswers: { questionNumber: number; selectedOption: number }[];
}

function storageKey(testCode: string) {
  return `hari-attempt:${testCode}`;
}

export function ExamFlow({ initialTest }: { initialTest: StudentSafeTest }) {
  const [attempt, setAttempt] = useState<StartAttemptResponse | null>(null);
  const [finishedResult, setFinishedResult] = useState<ResultPayload | null>(null);
  const [checkingResume, setCheckingResume] = useState(true);

  // On mount: was there already an attempt for this test in this browser?
  // If so, skip straight to the exam or the result — never re-show the entry form.
  useEffect(() => {
    const key = storageKey(initialTest.testCode);
    const storedAttemptId = sessionStorage.getItem(key);

    if (!storedAttemptId) {
      setCheckingResume(false);
      return;
    }

    fetch(`/api/attempts/${storedAttemptId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          sessionStorage.removeItem(key);
          return;
        }

        if (data.status === "in_progress") {
          setAttempt({
            success: true,
            attemptId: data.attemptId,
            actualEndTime: data.actualEndTime,
            test: data.test,
            questions: data.questions,
            savedAnswers: data.savedAnswers,
          });
        } else {
          setFinishedResult(data.result as ResultPayload);
        }
      })
      .catch(() => {
        // If the check fails, fall back to the normal landing form.
      })
      .finally(() => setCheckingResume(false));
  }, [initialTest.testCode]);

  function handleStarted(data: StartAttemptResponse) {
    sessionStorage.setItem(storageKey(initialTest.testCode), data.attemptId);
    setAttempt(data);
  }

  if (checkingResume) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (finishedResult) {
    return <ResultView result={finishedResult} />;
  }

  if (attempt) {
    return (
      <ExamRunner
        attemptId={attempt.attemptId}
        testTitle={attempt.test.title}
        actualEndTime={attempt.actualEndTime}
        questions={attempt.questions}
        savedAnswers={attempt.savedAnswers}
      />
    );
  }

  return <ExamLanding test={initialTest} onStarted={handleStarted} />;
}