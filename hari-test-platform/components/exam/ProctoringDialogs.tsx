"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Ban } from "lucide-react";

interface TabSwitchWarningDialogProps {
  open: boolean;
  violationCount: number;
  maxViolations: number;
  onAcknowledge: () => void;
}

export function TabSwitchWarningDialog({
  open,
  violationCount,
  maxViolations,
  onAcknowledge,
}: TabSwitchWarningDialogProps) {
  const remaining = Math.max(0, maxViolations - violationCount);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <DialogTitle>Final Warning</DialogTitle>
          </div>
          <DialogDescription>
            Switching away from this tab during the test is not allowed. This has been
            recorded ({violationCount}/{maxViolations}).
            {remaining > 0 &&
              ` If you leave the tab ${remaining} more time${
                remaining === 1 ? "" : "s"
              }, your test will be submitted automatically.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onAcknowledge}>I understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TabSwitchAutoSubmitDialogProps {
  open: boolean;
  onAcknowledge: () => void;
}

export function TabSwitchAutoSubmitDialog({ open, onAcknowledge }: TabSwitchAutoSubmitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 shrink-0 text-red-600" />
            <DialogTitle>Test Submitted Automatically</DialogTitle>
          </div>
          <DialogDescription>
            You left this tab 3 times during the test, which isn't allowed. Your test has
            been submitted automatically with your answers as they were at that point.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onAcknowledge}>View result</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}