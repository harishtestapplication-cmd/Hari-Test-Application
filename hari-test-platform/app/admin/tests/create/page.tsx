"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, Check, Copy, Upload } from "lucide-react";
import { toast } from "sonner";

type Step = "details" | "schedule" | "upload" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "schedule", label: "Schedule" },
  { key: "upload", label: "Upload" },
  { key: "review", label: "Review" },
];

export default function CreateTestPage() {
  const [step, setStep] = useState<Step>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ testCode: string; title: string } | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function validateDetails(): string[] {
    const errs: string[] = [];
    if (!title.trim()) errs.push("Title is required.");
    return errs;
  }

  function validateSchedule(): string[] {
    const errs: string[] = [];
    if (!startTime) errs.push("Start time is required.");
    if (!endTime) errs.push("End time is required.");
    const duration = Number(durationMinutes);
    if (!duration || duration <= 0) errs.push("Duration must be greater than 0.");
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (start >= end) errs.push("Start time must be before end time.");
      if (duration > 0 && duration * 60000 > end.getTime() - start.getTime()) {
        errs.push("Duration cannot exceed the test window (end time − start time).");
      }
    }
    return errs;
  }

  function validateUpload(): string[] {
    const errs: string[] = [];
    if (!file) errs.push("An .xlsx question file is required.");
    else if (!file.name.toLowerCase().endsWith(".xlsx")) errs.push("Only .xlsx files are accepted.");
    return errs;
  }

  function goNext() {
    let stepErrors: string[] = [];
    if (step === "details") stepErrors = validateDetails();
    if (step === "schedule") stepErrors = validateSchedule();
    if (step === "upload") stepErrors = validateUpload();

    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex].key);
  }

  function goBack() {
    setErrors([]);
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) setStep(STEPS[prevIndex].key);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);
      formData.append("startTime", new Date(startTime).toISOString());
      formData.append("endTime", new Date(endTime).toISOString());
      formData.append("durationMinutes", durationMinutes);
      formData.append("questionsFile", file as File);

      const res = await fetch("/api/tests", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) {
        setErrors(data.errors?.length ? data.errors : [data.message || "Failed to create test"]);
        setSubmitting(false);
        return;
      }

      toast.success("Test created");
      setResult({ testCode: data.test.testCode, title: data.test.title });
    } catch {
      setErrors(["Something went wrong. Please try again."]);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  if (result) {
    const link = typeof window !== "undefined" ? `${window.location.origin}/exam/${result.testCode}` : "";
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Test created</CardTitle>
            <CardDescription>{result.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Student link</Label>
              <div className="flex gap-2">
                <Input value={link} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy student link"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/tests" className="flex-1">
                <Button variant="outline" className="w-full">
                  View all tests
                </Button>
              </Link>
              <Link href="/admin/dashboard" className="flex-1">
                <Button className="w-full">Back to dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <Link href="/admin/tests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to tests
          </Button>
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Create Test</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === stepIndex ? "font-medium" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-inside list-disc space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          {step === "details" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Python Fundamentals — Batch 3"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Shown to students on the test landing page"
                />
              </div>
            </>
          )}

          {step === "schedule" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration per student (minutes)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g. 30"
                />
                <p className="text-xs text-muted-foreground">
                  If a student starts late, they get the lesser of this duration or the time left in
                  the window above.
                </p>
              </div>
            </>
          )}

          {step === "upload" && (
            <div className="space-y-3">
              <Label htmlFor="questionsFile">Questions file (.xlsx)</Label>
              <label
                htmlFor="questionsFile"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input py-10 text-center hover:bg-muted/50"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm">
                  {file ? file.name : "Click to select an .xlsx file"}
                </span>
                <span className="text-xs text-muted-foreground">Max 2MB</span>
              </label>
              <input
                id="questionsFile"
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Required columns: Q.No, Question, Opt1, Opt2, Opt3, Opt4, Correct Opt (1–4).
              </p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-3 text-sm">
              <ReviewRow label="Title" value={title} />
              {description && <ReviewRow label="Description" value={description} />}
              <ReviewRow
                label="Start"
                value={startTime ? new Date(startTime).toLocaleString() : "—"}
              />
              <ReviewRow label="End" value={endTime ? new Date(endTime).toLocaleString() : "—"} />
              <ReviewRow label="Duration" value={`${durationMinutes} minutes`} />
              <ReviewRow label="Questions file" value={file?.name || "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack} disabled={stepIndex === 0}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create Test"}
          </Button>
        ) : (
          <Button onClick={goNext}>
            Next
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}