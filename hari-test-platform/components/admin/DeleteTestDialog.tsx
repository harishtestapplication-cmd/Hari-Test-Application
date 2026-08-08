"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DeleteTestDialogProps {
  testId: string;
  testTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/**
 * Confirms and performs DELETE /api/tests/[id]. The server is the source of
 * truth on whether deletion is allowed (only UPCOMING tests) — this dialog
 * should only ever be opened for an UPCOMING test, but still surfaces the
 * server's rejection message if that assumption is ever wrong (e.g. a test
 * went LIVE in the seconds between page load and click).
 */
export function DeleteTestDialog({
  testId,
  testTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTestDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Failed to delete test");
        return;
      }
      toast.success("Test deleted");
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("Failed to delete test");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete test?</DialogTitle>
          <DialogDescription>
            This will permanently delete <span className="font-medium text-foreground">{testTitle}</span> and
            its questions. This can only be done before the test starts, and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={deleting} />}>
            Cancel
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}