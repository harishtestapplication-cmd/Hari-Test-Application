import { ITest } from "@/models/Test";
import { IAttempt, AttemptStatus, SubmissionType } from "@/models/Attempt";
import { sendStudentResultEmail } from "@/lib/brevo";

export interface CalculatedResult {
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalQuestions: number;
  percentage: number;
  score: number;
}

export function calculateResult(test: ITest, attempt: IAttempt): CalculatedResult {
  let correct = 0;
  let wrong = 0;

  for (const q of test.questions) {
    const given = attempt.answers.find((a) => a.questionNumber === q.questionNumber);
    if (!given) continue; // unanswered
    if (given.selectedOption === q.correctOption) correct++;
    else wrong++;
  }

  const total = test.questions.length;
  const unanswered = total - correct - wrong;
  const percentage = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  return {
    correctAnswers: correct,
    wrongAnswers: wrong,
    unanswered,
    totalQuestions: total,
    percentage,
    score: correct, // score == number correct; adjust here if you add negative marking later
  };
}

function statusForSubmissionType(type: SubmissionType): AttemptStatus {
  switch (type) {
    case "manual":
      return "submitted";
    case "duration_expired":
      return "time_expired";
    case "test_window_expired":
      return "test_expired";
  }
}

/**
 * Shared by: PATCH /answers (when time runs out mid-autosave),
 * POST /submit (manual + expired paths), and Phase 13's cron job for
 * attempts left in_progress after a closed browser. One source of truth
 * for "what happens when an attempt ends."
 */
export async function finalizeAttempt(
  test: ITest,
  attempt: IAttempt,
  submissionType: SubmissionType,
  mergeAnswers?: { questionNumber: number; selectedOption: number }[]
): Promise<IAttempt> {
  if (mergeAnswers && mergeAnswers.length > 0) {
    for (const a of mergeAnswers) {
      const idx = attempt.answers.findIndex((x) => x.questionNumber === a.questionNumber);
      if (idx >= 0) {
        attempt.answers[idx].selectedOption = a.selectedOption as 1 | 2 | 3 | 4;
      } else {
        attempt.answers.push({
          questionNumber: a.questionNumber,
          selectedOption: a.selectedOption as 1 | 2 | 3 | 4,
        });
      }
    }
    attempt.markModified("answers");
  }

  const result = calculateResult(test, attempt);
  attempt.score = result.score;
  attempt.correctAnswers = result.correctAnswers;
  attempt.wrongAnswers = result.wrongAnswers;
  attempt.unanswered = result.unanswered;
  attempt.totalQuestions = result.totalQuestions;
  attempt.percentage = result.percentage;
  attempt.submittedAt = new Date();
  attempt.status = statusForSubmissionType(submissionType);
  attempt.submissionType = submissionType;

  await attempt.save();

  // Fire-and-forget, but never let email failure undo a successful finalize.
  try {
    const sent = await sendStudentResultEmail(test, attempt);
    if (sent !== attempt.resultEmailSent) {
      attempt.resultEmailSent = sent;
      await attempt.save();
    }
  } catch (err) {
    console.error("Result email failed:", err);
  }

  return attempt;
}

/** No answer key, ever — this is what the client is allowed to see. */
export function buildResultPayload(attempt: IAttempt) {
  return {
    score: attempt.score,
    correctAnswers: attempt.correctAnswers,
    wrongAnswers: attempt.wrongAnswers,
    unanswered: attempt.unanswered,
    totalQuestions: attempt.totalQuestions,
    percentage: attempt.percentage,
    status: attempt.status,
    submissionType: attempt.submissionType,
    submittedAt: attempt.submittedAt,
    studentEmail: attempt.studentEmail,
    resultEmailSent: attempt.resultEmailSent,
  };
}