import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SiteBrand } from "@/components/common/SiteBrand";

export default function ExamNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <SiteBrand className="mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Test not found</CardTitle>
          <CardDescription>
            This test link is invalid or the test doesn&apos;t exist. Double-check the link
            with the person who shared it with you.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}