"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentSafeQuestion } from "./ExamFlow";

interface QuestionCardProps {
  question: StudentSafeQuestion;
  index: number;
  total: number;
  selectedOption: number | undefined;
  onSelect: (option: number) => void;
  disabled: boolean;
}

export function QuestionCard({
  question,
  index,
  total,
  selectedOption,
  onSelect,
  disabled,
}: QuestionCardProps) {
  const groupName = `question-${question.questionNumber}`;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Question {index + 1} of {total}
        </p>
        <CardTitle className="text-lg font-medium leading-relaxed">
          {question.question}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <fieldset disabled={disabled} className="space-y-3">
          <legend className="sr-only">Options for question {question.questionNumber}</legend>
          {question.options.map((optionText, i) => {
            const optionValue = i + 1;
            const inputId = `${groupName}-opt${optionValue}`;
            const isSelected = selectedOption === optionValue;

            return (
              <label
                key={optionValue}
                htmlFor={inputId}
                className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  id={inputId}
                  name={groupName}
                  value={optionValue}
                  checked={isSelected}
                  onChange={() => onSelect(optionValue)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-sm sm:text-base">{optionText}</span>
              </label>
            );
          })}
        </fieldset>
      </CardContent>
    </Card>
  );
}