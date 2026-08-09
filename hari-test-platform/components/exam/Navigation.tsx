"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavigationProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}

export function Navigation({ currentIndex, total, onPrev, onNext, disabled }: NavigationProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={disabled || currentIndex === 0}
        className="min-h-[44px] flex-1 sm:flex-none"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onNext}
        disabled={disabled || currentIndex === total - 1}
        className="min-h-[44px] flex-1 sm:flex-none"
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}