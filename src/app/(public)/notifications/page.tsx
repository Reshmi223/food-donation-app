"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatRelativeTime, api } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";

type NotificationItem = {
  id: string; type: string; title: string; message: string;
  linkUrl: string | null; readAt: string | null; createdAt: string;
};

/** Client-side auth gate: notifications require a signed-in account. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-9 w-56" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Bell className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden />
        <h1 className="text-xl font-semibold">Sign in to see your notifications</h1>
        <p className="mt-2 text-sm text-muted-foreground">Claims, pickups and verification updates live here.</p>
        <Button asChild className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

export default function NotificationsPage() {
  return (
    <AuthGate>
      <NotificationsBody />
    </AuthGate>
  );
}

function NotificationsBody() {
  const { data, isLoading, mutate } = useSWR<{ notifications: NotificationItem[]; unread: number }>("/api/notifications");
  const [busy, setBusy] = useState(false);

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.readAt);
  const read = notifications.filter((n) => n.readAt);

  async function markAll() {
    setBusy(true);
    try {
      await api("/api/notifications", { method: "PATCH", json: { all: true } });
      mutate();
    } finally {
      setBusy(false);
    }
  }

  async function markOne(n: NotificationItem) {
    if (n.readAt) return;
    await api("/api/notifications", { method: "PATCH", json: { id: n.id } });
    mutate();
  }

  const Item = ({ n }: { n: NotificationItem }) => (
    <Link
      href={n.linkUrl ?? "#"}
      onClick={() => markOne(n)}
      className={cn(
        "block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50",
        !n.readAt && "border-primary/40 bg-primary/[0.04]"
      )}
    >
      <div className="flex items-start gap-3">
        {!n.readAt ? (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{n.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
            {formatRelativeTime(n.createdAt)} · {n.type.replace(/_/g, " ").toLowerCase()}
          </p>
        </div>
      </div>
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-9 w-56" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">{data?.unread ?? 0} unread</p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={markAll} disabled={busy || (data?.unread ?? 0) === 0}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCheck className="h-4 w-4" aria-hidden />}
          Mark all read
        </Button>
      </div>

      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="unread" className="mt-4 space-y-3">
          {unread.length === 0 ? (
            <EmptyState icon={Bell} title="You're all caught up" description="New claims, pickup reminders and verification updates appear here." />
          ) : (
            unread.map((n) => <Item key={n.id} n={n} />)
          )}
        </TabsContent>
        <TabsContent value="all" className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications yet" description="Platform activity that concerns you will appear here." />
          ) : (
            notifications.map((n) => <Item key={n.id} n={n} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
