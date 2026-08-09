"use client";

import { SiteBrand } from "@/components/common/SiteBrand";

interface ExamHeaderProps {
  title: string;
  msRemaining: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ExamHeader({ title, msRemaining }: ExamHeaderProps) {
  const isCritical = msRemaining <= 60_000; // < 1 min
  const isWarning = !isCritical && msRemaining <= 5 * 60_000; // < 5 min

  const timerClasses = isCritical
    ? "bg-red-600 text-white animate-pulse"
    : isWarning
      ? "bg-amber-100 text-amber-900"
      : "bg-muted text-foreground";

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <SiteBrand className="mb-0.5" />
          <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-mono font-semibold tabular-nums ${timerClasses}`}
          role="timer"
          aria-live="polite"
        >
          {isCritical && <span aria-hidden="true">⚠</span>}
          <span>{formatTime(msRemaining)}</span>
          <span className="sr-only">remaining</span>
        </div>
      </div>
    </header>
  );
}