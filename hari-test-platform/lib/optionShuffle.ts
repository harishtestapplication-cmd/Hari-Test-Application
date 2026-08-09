import { IQuestion } from "@/models/Test";

export interface OptionOrder {
  questionNumber: number;
  order: number[]; // original 1-based option numbers, in the sequence shown to the student
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generated exactly once, when an attempt is created. Never call this again
 * for the same attempt — resuming after a refresh must reuse the stored
 * order, or the student's already-selected answers would silently point at
 * the wrong displayed option.
 */
export function generateOptionOrders(questions: IQuestion[]): OptionOrder[] {
  return questions.map((q) => ({
    questionNumber: q.questionNumber,
    order: shuffle(q.options.map((_, i) => i + 1)),
  }));
}

export function findOrder(
  optionOrders: OptionOrder[] | undefined,
  questionNumber: number
): number[] | undefined {
  return optionOrders?.find((o) => o.questionNumber === questionNumber)?.order;
}

/** Displayed position (1-based, what the student clicked) -> canonical option number. */
export function toOriginalOption(order: number[], displayedOption: number): number {
  return order[displayedOption - 1] ?? displayedOption;
}

/** Canonical option number (from DB) -> displayed position (1-based) the student saw. */
export function toDisplayedOption(order: number[], originalOption: number): number {
  const idx = order.indexOf(originalOption);
  return idx === -1 ? originalOption : idx + 1;
}