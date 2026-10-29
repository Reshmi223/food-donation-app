import { Database } from "lucide-react";
import { DEMO_MODE } from "@/lib/constants";

/**
 * Clearly labels the platform when running with seeded demo data, per the
 * "no invented statistics" requirement — demo content is always marked.
 */
export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-[oklch(0.83_0.09_90/0.3)] px-4 py-1.5 text-center text-xs font-medium text-[oklch(0.42_0.09_65)]">
      <Database className="h-3.5 w-3.5" aria-hidden />
      Demo environment — statistics, listings and stories shown are sample data for evaluation.
    </div>
  );
}
