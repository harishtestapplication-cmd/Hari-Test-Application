"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttemptStatusBadge } from "@/components/admin/StatusBadge";
import { ArrowLeft, Copy, Download, BarChart3, BookOpenCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QuestionsDialog } from "@/components/admin/QuestionsDialog";
import { DeleteTestDialog } from "@/components/admin/DeleteTestDialog";

interface TestDetail {
  _id: string;
  title: string;
  description?: string;
  testCode: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  questions: unknown[];
  derivedStatus: "UPCOMING" | "LIVE" | "ENDED";
}

interface Stats {
  totalAttempts: number;
  completed: number;
  expired: number;
  averagePercentage: number;
  highPercentage: number;
  lowPercentage: number;
}

interface AttemptRow {
  id: string;
  studentName?: string;
  studentEmail: string;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  status: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  UPCOMING: "bg-blue-500",
  LIVE: "bg-green-600",
  ENDED: "bg-muted text-muted-foreground",
};

export default function TestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tests/${id}`).then((res) => res.json()),
      fetch(`/api/tests/${id}/results`).then((res) => res.json()),
    ])
      .then(([testData, resultsData]) => {
        if (!testData.success) {
          toast.error(testData.message || "Failed to load test");
          return;
        }
        setTest(testData.test);
        if (resultsData.success) {
          setStats(resultsData.stats);
          setAttempts(resultsData.attempts);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  function copyLink() {
    if (!test) return;
    const url = `${window.location.origin}/exam/${test.testCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  if (!test) {
    return <div className="p-8 text-muted-foreground">Test not found.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/tests")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to tests
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{test.title}</h1>
            <Badge className={STATUS_BADGE_CLASS[test.derivedStatus]}>{test.derivedStatus}</Badge>
          </div>
          {test.description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{test.description}</p>
          )}
          <p className="mt-1 font-mono text-xs text-muted-foreground">{test.testCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowQuestions(true)}>
            <BookOpenCheck className="mr-2 h-4 w-4" />
            View Questions
          </Button>
          <Button variant="outline" onClick={copyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </Button>
          <a href={`/api/tests/${test._id}/results/excel`}>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Report
            </Button>
          </a>
          <Link href={`/admin/tests/${test._id}/results`}>
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              Full Results
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={() => setShowDelete(true)}
            disabled={test.derivedStatus !== "UPCOMING"}
            title={
              test.derivedStatus === "UPCOMING"
                ? "Delete test"
                : "Only upcoming tests can be deleted"
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InfoCard label="Starts" value={new Date(test.startTime).toLocaleString()} />
        <InfoCard label="Ends" value={new Date(test.endTime).toLocaleString()} />
        <InfoCard label="Duration" value={`${test.durationMinutes} min`} />
        <InfoCard label="Questions" value={String(test.questions.length)} />
        {stats && <InfoCard label="Attempts" value={String(stats.totalAttempts)} />}
        {stats && <InfoCard label="Average" value={`${stats.averagePercentage}%`} />}
      </div>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.slice(0, 10).map((a) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {attempts.length > 10 && (
            <div className="p-4 text-center">
              <Link href={`/admin/tests/${test._id}/results`}>
                <Button variant="outline" size="sm">
                  View all {attempts.length} attempts
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <QuestionsDialog
        testId={test._id}
        testTitle={test.title}
        open={showQuestions}
        onOpenChange={setShowQuestions}
      />

      <DeleteTestDialog
        testId={test._id}
        testTitle={test.title}
        open={showDelete}
        onOpenChange={setShowDelete}
        onDeleted={() => router.push("/admin/tests")}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}