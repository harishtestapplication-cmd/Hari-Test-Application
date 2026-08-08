import { cn } from "@/lib/utils";

export function SiteBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
        H
      </span>
      <span className="text-sm font-semibold tracking-tight text-foreground">
        HariTestPlatform
      </span>
    </div>
  );
}