import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "warning" | "danger";
  loading?: boolean;
}) {
  const tones = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    warning: "bg-[oklch(0.83_0.09_90/0.3)] text-[oklch(0.42_0.09_65)]",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="py-4">
      <CardContent className="flex items-start gap-3 px-4">
        <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </div>
        <div className="min-w-0">
          {loading ? (
            <>
              <Skeleton className="h-6 w-16" />
              <Skeleton className="mt-1.5 h-3.5 w-24" />
            </>
          ) : (
            <>
              <div className="truncate text-2xl font-bold tracking-tight tabular-nums">{value}</div>
              <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
              {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{hint}</div>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
