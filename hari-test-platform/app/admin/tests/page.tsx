"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Copy, Download, Eye, BarChart3, BookOpenCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { QuestionsDialog } from "@/components/admin/QuestionsDialog";
import { DeleteTestDialog } from "@/components/admin/DeleteTestDialog";

interface TestRow {
  _id: string;
  title: string;
  testCode: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  questions: unknown[];
  derivedStatus: "UPCOMING" | "LIVE" | "ENDED";
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  UPCOMING: "bg-blue-500",
  LIVE: "bg-green-600",
  ENDED: "bg-muted text-muted-foreground",
};

export default function TestsListPage() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [questionsTest, setQuestionsTest] = useState<TestRow | null>(null);
  const [deleteTest, setDeleteTest] = useState<TestRow | null>(null);

  function loadTests() {
    setLoading(true);
    fetch("/api/tests")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          toast.error(data.message || "Failed to load tests");
          return;
        }
        setTests(data.tests);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTests();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter(
      (t) => t.title.toLowerCase().includes(q) || t.testCode.toLowerCase().includes(q)
    );
  }, [tests, query]);

  function copyLink(testCode: string) {
    const url = `${window.location.origin}/exam/${testCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Tests</h1>
        <Link href="/admin/tests/create">
          <Button className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Test
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Search by title or test code..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:max-w-sm"
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {tests.length === 0 ? "No tests created yet." : "No tests match your search."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t._id}>
                    <TableCell className="max-w-[200px] truncate font-medium">{t.title}</TableCell>
                    <TableCell className="font-mono text-xs">{t.testCode}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE_CLASS[t.derivedStatus]}>
                        {t.derivedStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(t.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{t.durationMinutes} min</TableCell>
                    <TableCell className="text-sm">{t.questions.length}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/tests/${t._id}`}>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="View"
                            aria-label={`View ${t.title}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          title="View questions"
                          aria-label={`View questions for ${t.title}`}
                          onClick={() => setQuestionsTest(t)}
                        >
                          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Link href={`/admin/tests/${t._id}/results`}>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Results"
                            aria-label={`View results for ${t.title}`}
                          >
                            <BarChart3 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          title="Copy student link"
                          aria-label={`Copy student link for ${t.title}`}
                          onClick={() => copyLink(t.testCode)}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <a href={`/api/tests/${t._id}/results/excel`}>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Download report"
                            aria-label={`Download report for ${t.title}`}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </a>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          title={
                            t.derivedStatus === "UPCOMING"
                              ? "Delete test"
                              : "Only upcoming tests can be deleted"
                          }
                          aria-label={`Delete ${t.title}`}
                          disabled={t.derivedStatus !== "UPCOMING"}
                          className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                          onClick={() => setDeleteTest(t)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {questionsTest && (
        <QuestionsDialog
          testId={questionsTest._id}
          testTitle={questionsTest.title}
          open={!!questionsTest}
          onOpenChange={(open) => !open && setQuestionsTest(null)}
        />
      )}

      {deleteTest && (
        <DeleteTestDialog
          testId={deleteTest._id}
          testTitle={deleteTest.title}
          open={!!deleteTest}
          onOpenChange={(open) => !open && setDeleteTest(null)}
          onDeleted={loadTests}
        />
      )}
    </div>
  );
}