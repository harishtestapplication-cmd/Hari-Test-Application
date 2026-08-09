import { customAlphabet } from "nanoid";
import Test, { ITest } from "@/models/Test";
import Attempt from "@/models/Attempt";
import { CreateTestFieldsInput } from "@/lib/validation";
import { ParsedQuestion } from "@/lib/excel";
import { deriveTestStatus } from "@/lib/exam";
import { OptionOrder, findOrder } from "@/lib/optionShuffle";

export class DeleteTestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

async function generateUniqueTestCode(subjectHint: string): Promise<string> {
  const prefix =
    subjectHint
      .split(" ")[0]
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10) || "TEST";

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${prefix}-${generateCode()}`;
    const existing = await Test.findOne({ testCode: code });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique test code, please try again");
}

export async function createTest(
  fields: CreateTestFieldsInput,
  questions: ParsedQuestion[],
  adminId: string
) {
  const testCode = await generateUniqueTestCode(fields.title);

  const test = await Test.create({
    title: fields.title,
    description: fields.description,
    startTime: fields.startTime,
    endTime: fields.endTime,
    durationMinutes: fields.durationMinutes,
    questions,
    testCode,
    createdBy: adminId,
  });

  return test;
}

// unchanged below


export function toStudentSafeTest(test: ITest | any) {
  return {
    id: test._id?.toString() ?? test.id,
    title: test.title,
    description: test.description,
    testCode: test.testCode,
    startTime: test.startTime,
    endTime: test.endTime,
    durationMinutes: test.durationMinutes,
    questionCount: test.questions.length,
    derivedStatus: test.derivedStatus,
  };
}

export function toStudentSafeQuestions(test: ITest | any) {
  return test.questions
    .map((q: any) => ({
      questionNumber: q.questionNumber,
      question: q.question,
      options: q.options,
    }))
    .sort((a: any, b: any) => a.questionNumber - b.questionNumber);
}

/**
 * Same as toStudentSafeQuestions, but reorders each question's options
 * array according to that attempt's stored optionOrders — this is what
 * actually shows shuffled options to the student. Falls back to the
 * canonical order if a question has no stored order (shouldn't happen for
 * attempts created after this feature shipped, but keeps old data safe).
 */
export function toShuffledStudentSafeQuestions(test: ITest | any, optionOrders: OptionOrder[]) {
  return test.questions
    .map((q: any) => {
      const order = findOrder(optionOrders, q.questionNumber) ?? q.options.map((_: unknown, i: number) => i + 1);
      return {
        questionNumber: q.questionNumber,
        question: q.question,
        options: order.map((originalIndex: number) => q.options[originalIndex - 1]),
      };
    })
    .sort((a: any, b: any) => a.questionNumber - b.questionNumber);
}


export async function listTests() {
  const tests = await Test.find().sort({ createdAt: -1 }).lean();
  return tests.map((t) => ({
    ...t,
    derivedStatus: deriveTestStatus(t.startTime, t.endTime),
  }));
}

export async function getTestById(id: string) {
  const test = await Test.findById(id).lean();
  if (!test) return null;
  return { ...test, derivedStatus: deriveTestStatus(test.startTime, test.endTime) };
}

export async function getTestByCode(testCode: string) {
  const test = await Test.findOne({ testCode: testCode.toUpperCase().trim() }).lean();
  if (!test) return null;
  return { ...test, derivedStatus: deriveTestStatus(test.startTime, test.endTime) };
}

/**
 * Only UPCOMING tests may be deleted — once a test is LIVE or ENDED it may
 * already have (or have had) real student attempts, so removing it would
 * silently destroy attempt history / in-progress exams. Attempts are
 * cascade-deleted defensively; in practice an UPCOMING test should have
 * zero attempts since startAttempt() itself refuses to start before
 * test.startTime.
 */
export async function deleteTestById(id: string) {
  const test = await Test.findById(id);
  if (!test) {
    throw new DeleteTestError("Test not found", 404);
  }

  const status = deriveTestStatus(test.startTime, test.endTime);
  if (status !== "UPCOMING") {
    throw new DeleteTestError(
      "Only upcoming tests that haven't started yet can be deleted.",
      409
    );
  }

  await Attempt.deleteMany({ testId: test._id });
  await test.deleteOne();
}