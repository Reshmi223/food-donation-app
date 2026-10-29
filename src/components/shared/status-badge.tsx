import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LISTING_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  AVAILABLE: "bg-[oklch(0.4692_0.0994_158.43/0.12)] text-primary border-transparent",
  PARTIALLY_RESERVED: "bg-[oklch(0.83_0.09_90/0.25)] text-[oklch(0.45_0.09_70)] border-transparent",
  FULLY_RESERVED: "bg-[oklch(0.83_0.09_90/0.35)] text-[oklch(0.4_0.09_60)] border-transparent",
  PICKED_UP: "bg-[oklch(0.5685_0.1187_154.95/0.15)] text-secondary border-transparent",
  COMPLETED: "bg-[oklch(0.4692_0.0994_158.43/0.2)] text-primary border-transparent",
  EXPIRED: "bg-muted text-muted-foreground border-transparent",
  WITHDRAWN: "bg-muted text-muted-foreground border-transparent",
  FLAGGED: "bg-destructive/12 text-destructive border-transparent",
};

const CLAIM_STYLES: Record<string, string> = {
  REQUESTED: "bg-[oklch(0.83_0.09_90/0.25)] text-[oklch(0.45_0.09_70)] border-transparent",
  ACCEPTED: "bg-[oklch(0.5685_0.1187_154.95/0.15)] text-secondary border-transparent",
  REJECTED: "bg-destructive/12 text-destructive border-transparent",
  CANCELLED: "bg-muted text-muted-foreground border-transparent",
  READY_FOR_PICKUP: "bg-[oklch(0.4692_0.0994_158.43/0.14)] text-primary border-transparent",
  PICKED_UP: "bg-[oklch(0.5685_0.1187_154.95/0.15)] text-secondary border-transparent",
  DELIVERED: "bg-[oklch(0.5685_0.1187_154.95/0.2)] text-secondary border-transparent",
  COMPLETED: "bg-[oklch(0.4692_0.0994_158.43/0.2)] text-primary border-transparent",
  DISPUTED: "bg-destructive/12 text-destructive border-transparent",
};

export function ListingStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", LISTING_STYLES[status] ?? "bg-muted", className)}>
      {status === "PARTIALLY_RESERVED" ? "Partially reserved" : status === "FULLY_RESERVED" ? "Fully reserved" : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}

export function ClaimStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", CLAIM_STYLES[status] ?? "bg-muted", className)}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}

export function VerificationBadge({ status, className }: { status: string; className?: string }) {
  const styles: Record<string, string> = {
    VERIFIED: "bg-[oklch(0.4692_0.0994_158.43/0.15)] text-primary border-transparent",
    PENDING: "bg-[oklch(0.83_0.09_90/0.25)] text-[oklch(0.45_0.09_70)] border-transparent",
    REJECTED: "bg-destructive/12 text-destructive border-transparent",
    SUSPENDED: "bg-destructive/15 text-destructive border-transparent",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status] ?? "bg-muted", className)}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
