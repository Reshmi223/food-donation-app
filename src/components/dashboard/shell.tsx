"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, History, UserCircle, Building2,
  Bike, ShieldCheck, BarChart3, FileCheck2, Users, Flag, Settings, ScrollText,
  Bell, LogOut, Menu, HandHeart, SearchX, PackageCheck, ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api-client";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ShellUser = {
  id: string;
  role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN";
  displayName: string;
  organizationName?: string | null;
  verificationStatus: string;
  email: string;
};

const NAV_BY_ROLE: Record<string, { href: string; label: string; icon: typeof LayoutDashboard; badge?: string }[]> = {
  DONOR: [
    { href: "/dashboard/donor", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/donor/listings/new", label: "New Listing", icon: UtensilsCrossed },
    { href: "/dashboard/donor/claims", label: "Claim Requests", icon: ClipboardList },
    { href: "/dashboard/donor/history", label: "Donation History", icon: History },
    { href: "/dashboard/donor/profile", label: "My Profile", icon: UserCircle },
  ],
  NGO: [
    { href: "/dashboard/ngo", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/ngo/browse", label: "Browse Food", icon: SearchX },
    { href: "/dashboard/ngo/claims", label: "My Claims", icon: ClipboardList },
    { href: "/dashboard/ngo/history", label: "Collections", icon: History },
    { href: "/dashboard/ngo/profile", label: "NGO Profile & Verification", icon: Building2 },
  ],
  VOLUNTEER: [
    { href: "/dashboard/volunteer", label: "My Deliveries", icon: Bike },
    { href: "/dashboard/volunteer/profile", label: "My Profile", icon: UserCircle },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/verifications", label: "Verifications", icon: FileCheck2 },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/listings", label: "Listings", icon: UtensilsCrossed },
    { href: "/dashboard/admin/reports", label: "Safety Reports", icon: Flag },
    { href: "/dashboard/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
    { href: "/dashboard/admin/audit", label: "Audit Log", icon: ScrollText },
  ],
};

function NavLinks({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const nav = NAV_BY_ROLE[role] ?? [];
  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-1 px-3">
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== `/dashboard/${role.toLowerCase()}` && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/notifications"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          pathname === "/notifications" && "bg-primary/10 text-primary"
        )}
      >
        <Bell className="h-4.5 w-4.5 shrink-0" aria-hidden /> Notifications
      </Link>
    </nav>
  );
}

function StatusBanner({ user }: { user: ShellUser }) {
  if (user.role === "NGO" && user.verificationStatus !== "VERIFIED") {
    return (
      <div className="mx-4 mb-2 rounded-lg border border-[oklch(0.83_0.09_90)] bg-[oklch(0.83_0.09_90/0.15)] px-3.5 py-2.5 text-xs text-[oklch(0.42_0.09_65)]">
        <p className="font-semibold">Verification {user.verificationStatus.toLowerCase()}</p>
        <p className="mt-0.5">
          {user.verificationStatus === "PENDING"
            ? "Submit documents from your NGO profile to become eligible to claim food."
            : "Your verification was not approved. Contact support."}
        </p>
      </div>
    );
  }
  return null;
}

export function DashboardShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }

  const homeHref =
    user.role === "DONOR" ? "/dashboard/donor"
    : user.role === "NGO" ? "/dashboard/ngo"
    : user.role === "VOLUNTEER" ? "/dashboard/volunteer"
    : "/dashboard/admin";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b px-5 py-4 text-left">
                <SheetTitle><Logo size={30} /></SheetTitle>
              </SheetHeader>
              <div className="py-3">
                <StatusBanner user={user} />
                <NavLinks role={user.role} onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <Link href={homeHref} className="hidden lg:block" aria-label="Dashboard home">
            <Logo size={32} />
          </Link>
          <span className="hidden text-sm font-medium text-muted-foreground lg:block">·</span>
          <Badge variant="outline" className="hidden bg-primary/5 font-medium lg:inline-flex">
            {ROLE_LABELS[user.role]}
          </Badge>

          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
              <span className="flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Public site</span>
            </Link>
            <ThemeToggle />
            <NotificationBell />
            <div className="flex items-center gap-2.5 border-l pl-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-medium leading-tight">{user.displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.organizationName ?? user.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r bg-sidebar py-4 lg:block" aria-label="Dashboard sidebar">
          <StatusBanner user={user} />
          <NavLinks role={user.role} />
          <div className="mt-6 px-6">
            <div className="rounded-xl bg-cream p-4 text-center dark:bg-muted/40">
              <LogoMark size={28} className="mx-auto" />
              <p className="mt-2 text-[11px] font-medium leading-snug text-muted-foreground">
                Rescue Food. Restore Hope.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
