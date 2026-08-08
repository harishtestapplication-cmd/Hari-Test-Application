"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, ListChecks } from "lucide-react";
import { SiteBrand } from "@/components/common/SiteBrand";
import type { StartAttemptResponse } from "./ExamFlow";

export interface StudentSafeTest {
  id: string;
  title: string;
  description?: string;
  testCode: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  questionCount: number;
  derivedStatus: "UPCOMING" | "LIVE" | "ENDED";
}

// Renders nothing meaningful until mounted, avoiding server/client locale mismatches.
function FormattedTime({ iso }: { iso: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span suppressHydrationWarning>—</span>;
  }

  return (
    <span suppressHydrationWarning>
      {new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    </span>
  );
}

export function ExamLanding({
  test,
  onStarted,
}: {
  test: StudentSafeTest;
  onStarted: (data: StartAttemptResponse) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/exams/${test.testCode}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Could not start the test");
        setLoading(false);
        return;
      }

      onStarted(data as StartAttemptResponse);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }
return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <SiteBrand className="mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{test.title}</CardTitle>
            <StatusBadge status={test.derivedStatus} />
          </div>
          {test.description && <CardDescription>{test.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                <FormattedTime iso={test.startTime} /> — <FormattedTime iso={test.endTime} />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{test.durationMinutes} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              <span>{test.questionCount} questions</span>
            </div>
          </div>

          {test.derivedStatus === "UPCOMING" && (
            <p className="text-sm rounded-md bg-amber-50 text-amber-800 p-3">
              This test has not started yet. It starts at <FormattedTime iso={test.startTime} />.
            </p>
          )}

          {test.derivedStatus === "ENDED" && (
            <p className="text-sm rounded-md bg-red-50 text-red-800 p-3">
              This test has ended.
            </p>
          )}

          {test.derivedStatus === "LIVE" && (
            <form onSubmit={handleStart} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Starting..." : "Start Test"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: StudentSafeTest["derivedStatus"] }) {
  if (status === "LIVE") return <Badge className="bg-green-600">Live</Badge>;
  if (status === "UPCOMING") return <Badge variant="secondary">Upcoming</Badge>;
  return <Badge variant="outline">Ended</Badge>;
}