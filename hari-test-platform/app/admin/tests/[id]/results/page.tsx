"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttemptStatusBadge } from "@/components/admin/StatusBadge";
import { Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface AttemptRow {
  id: string;
  studentName?: string;
  studentEmail: string;
  submittedAt?: string;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  status: string;
  resultEmailSent: boolean;
}

interface Stats {
  totalAttempts: number;
  completed: number;
  expired: number;
  averagePercentage: number;
  highPercentage: number;
  lowPercentage: number;
}

export default function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [testTitle, setTestTitle] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tests/${id}/results`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          toast.error(data.message || "Failed to load results");
          return;
        }
        setTestTitle(data.test.title);
        setStats(data.stats);
        setAttempts(data.attempts);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleResend(attemptId: string) {
    setResendingId(attemptId);
    try {
      const res = await fetch(`/api/results/${attemptId}/email`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Email resent");
        setAttempts((prev) =>
          prev.map((a) => (a.id === attemptId ? { ...a, resultEmailSent: true } : a))
        );
      } else {
        toast.error(data.message || "Failed to resend");
      }
    } catch {
      toast.error("Failed to resend");
    } finally {
      setResendingId(null);
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/dashboard")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="mt-2 text-2xl font-semibold">{testTitle} — Results</h1>
        </div>
        <a href={`/api/tests/${id}/results/excel`}>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Download Excel
          </Button>
        </a>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          <StatCard label="Total" value={stats.totalAttempts} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Expired" value={stats.expired} />
          <StatCard label="Average" value={`${stats.averagePercentage}%`} />
          <StatCard label="Highest" value={`${stats.highPercentage}%`} />
          <StatCard label="Lowest" value={`${stats.lowPercentage}%`} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attempts</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {attempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No attempts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.studentName || "—"}</TableCell>
                    <TableCell>{a.studentEmail}</TableCell>
                    <TableCell>
                      {a.score !== undefined ? `${a.score}/${a.totalQuestions}` : "—"}
                    </TableCell>
                    <TableCell>{a.percentage !== undefined ? `${a.percentage}%` : "—"}</TableCell>
                    <TableCell>
                      <AttemptStatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>{a.resultEmailSent ? "Yes" : "No"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/tests/${id}/results/${a.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resendingId === a.id || a.status === "in_progress"}
                        onClick={() => handleResend(a.id)}
                      >
                        {resendingId === a.id ? "Sending…" : "Resend"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}