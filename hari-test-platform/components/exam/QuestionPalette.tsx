"use client";

import { Check } from "lucide-react";

interface QuestionPaletteProps {
  questionNumbers: number[];
  answeredNumbers: Set<number>;
  currentIndex: number;
  onJump: (index: number) => void;
  disabled: boolean;
}

export function QuestionPalette({
  questionNumbers,
  answeredNumbers,
  currentIndex,
  onJump,
  disabled,
}: QuestionPaletteProps) {
  return (
    <div
      className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10"
      role="group"
      aria-label="Question navigator"
    >
      {questionNumbers.map((qNo, index) => {
        const isAnswered = answeredNumbers.has(qNo);
        const isCurrent = index === currentIndex;

        return (
          <button
            key={qNo}
            type="button"
            disabled={disabled}
            onClick={() => onJump(index)}
            aria-current={isCurrent ? "true" : undefined}
            aria-label={`Question ${index + 1}${isAnswered ? ", answered" : ", not answered"}`}
            className={`relative flex h-11 w-11 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
              isCurrent
                ? "border-primary ring-2 ring-primary ring-offset-2"
                : isAnswered
                ? "border-green-600 bg-green-50 text-green-800"
                : "border-input bg-background text-muted-foreground"
            } ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary"}`}
          >
            {index + 1}
            {isAnswered && (
              <Check className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-green-600 p-0.5 text-white" />
            )}
          </button>
        );
      })}
    </div>
  );
}