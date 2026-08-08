"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SubmitBarProps {
  answeredCount: number;
  totalCount: number;
  onConfirmSubmit: () => void;
  disabled: boolean;
}

export function SubmitBar({ answeredCount, totalCount, onConfirmSubmit, disabled }: SubmitBarProps) {
  const [open, setOpen] = useState(false);
  const unanswered = totalCount - answeredCount;

  return (
    <>
      <Button
        type="button"
        className="min-h-[44px] w-full"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Submit Test
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit test?</DialogTitle>
            <DialogDescription>
              You've answered <strong>{answeredCount}</strong> of{" "}
              <strong>{totalCount}</strong> questions.
              {unanswered > 0 && (
                <>
                  {" "}
                  <strong>{unanswered}</strong> question{unanswered === 1 ? "" : "s"} will be
                  left unanswered. This cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep working
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                onConfirmSubmit();
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}