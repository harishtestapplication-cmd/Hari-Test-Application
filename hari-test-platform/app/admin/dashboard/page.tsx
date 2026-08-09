"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttemptStatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface DashboardData {
  counts: { totalTests: number; upcoming: number; live: number; ended: number };
  totalAttempts: number;
  averagePercentage: number;
  recentTests: {
    id: string;
    title: string;
    testCode: string;
    derivedStatus: "UPCOMING" | "LIVE" | "ENDED";
    createdAt: string;
  }[];
  liveTests: {
    id: string;
    title: string;
    testCode: string;
    startTime: string;
    endTime: string;
  }[];
  recentResults: {
    attemptId: string;
    testId: string | null;
    testTitle: string;
    studentName?: string;
    studentEmail: string;
    percentage?: number;
    status: string;
    submittedAt?: string;
  }[];
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  UPCOMING: "bg-blue-500",
  LIVE: "bg-green-600",
  ENDED: "bg-muted text-muted-foreground",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((res) => {
        if (!res.success) {
          toast.error(res.message || "Failed to load dashboard");
          return;
        }
        setData(res);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4 text-muted-foreground sm:p-8">Loading…</div>;
  }

  if (!data) {
    return <div className="p-4 text-muted-foreground sm:p-8">Couldn't load the dashboard.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:space-y-8 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/admin/tests/create">
          <Button className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Test
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Total Tests" value={data.counts.totalTests} />
        <StatCard label="Live Now" value={data.counts.live} />
        <StatCard label="Upcoming" value={data.counts.upcoming} />
        <StatCard label="Total Attempts" value={data.totalAttempts} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.liveTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tests are live right now.</p>
            ) : (
              data.liveTests.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/tests/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.testCode}</p>
                  </div>
                  <Badge className="shrink-0 bg-green-600">LIVE</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentTests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tests created yet.</p>
            ) : (
              data.recentTests.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/tests/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.testCode}</p>
                  </div>
                  <Badge className={`shrink-0 ${STATUS_BADGE_CLASS[t.derivedStatus]}`}>
                    {t.derivedStatus}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submitted attempts yet.</p>
          ) : (
            data.recentResults.map((r) => (
              <div
                key={r.attemptId}
                className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.studentName || r.studentEmail}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.testTitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm">
                    {r.percentage !== undefined ? `${r.percentage}%` : "—"}
                  </span>
                  <AttemptStatusBadge status={r.status} />
                  {r.testId && (
                    <Link href={`/admin/tests/${r.testId}/results/${r.attemptId}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))
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
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}