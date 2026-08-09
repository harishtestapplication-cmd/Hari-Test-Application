import Test from "@/models/Test";
import Attempt, { IAttempt } from "@/models/Attempt";
import { computeActualEndTime } from "@/lib/exam";
import { toStudentSafeTest, toShuffledStudentSafeQuestions } from "@/services/testService";
import { generateOptionOrders, findOrder, toDisplayedOption } from "@/lib/optionShuffle";

export class StartAttemptError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface StartAttemptResult {
  success: true;
  attemptId: string;
  actualEndTime: Date;
  test: ReturnType<typeof toStudentSafeTest>;
  questions: ReturnType<typeof toShuffledStudentSafeQuestions>;
  savedAnswers: { questionNumber: number; selectedOption: number }[];
}

export async function startAttempt(
  testCode: string,
  email: string,
  name?: string
): Promise<StartAttemptResult> {
  const test = await Test.findOne({ testCode: testCode.toUpperCase().trim() });
  if (!test) {
    throw new StartAttemptError("Test not found", 404);
  }

  const now = new Date();
  if (now < test.startTime) {
    throw new StartAttemptError("This test has not started yet.", 403);
  }
  if (now >= test.endTime) {
    throw new StartAttemptError("This test has ended.", 403);
  }

  const normalizedStudentEmail = email.trim().toLowerCase();

  let attempt = await Attempt.findOne({ testId: test._id, normalizedStudentEmail });

  if (attempt) {
    if (attempt.status !== "in_progress") {
      throw new StartAttemptError("You have already completed this test.", 409);
    }
    // Resume path — never touch startedAt / actualEndTime / optionOrders again.
    return buildResult(test, attempt);
  }

  const actualEndTime = computeActualEndTime(now, test.durationMinutes, test.endTime);
  // Generated once, right here, at creation — this is the only place a new
  // shuffle order is ever produced for an attempt.
  const optionOrders = generateOptionOrders(test.questions);

  try {
    attempt = await Attempt.create({
      testId: test._id,
      studentName: name?.trim() || undefined,
      studentEmail: email.trim(),
      normalizedStudentEmail,
      startedAt: now,
      actualEndTime,
      answers: [],
      optionOrders,
      status: "in_progress",
    });
  } catch (err: unknown) {
    // Two tabs hitting "start" at the same instant -> unique index throws E11000.
    // Treat it as a race, not a failure: re-fetch and return the winning attempt
    // (with whichever optionOrders actually won the insert).
    if (isDuplicateKeyError(err)) {
      const existing = await Attempt.findOne({ testId: test._id, normalizedStudentEmail });
      if (!existing) throw err;
      if (existing.status !== "in_progress") {
        throw new StartAttemptError("You have already completed this test.", 409);
      }
      return buildResult(test, existing);
    }
    throw err;
  }

  return buildResult(test, attempt);
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

function buildResult(test: InstanceType<typeof Test>, attempt: IAttempt): StartAttemptResult {
  return {
    success: true,
    attemptId: attempt._id.toString(),
    actualEndTime: attempt.actualEndTime,
    test: toStudentSafeTest(test),
    questions: toShuffledStudentSafeQuestions(test, attempt.optionOrders),
    // Stored answers are in canonical (original) option-index terms; convert
    // back to displayed position so the resumed UI checks the same radio
    // button the student actually clicked.
    savedAnswers: attempt.answers.map((a) => {
      const order = findOrder(attempt.optionOrders, a.questionNumber);
      return {
        questionNumber: a.questionNumber,
        selectedOption: order ? toDisplayedOption(order, a.selectedOption) : a.selectedOption,
      };
    }),
  };
}