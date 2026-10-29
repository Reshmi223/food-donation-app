"use client";

import useSWR from "swr";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { api, formatRelativeTime } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, mutate } = useSWR<{ notifications: NotificationItem[]; unread: number }>(
    "/api/notifications",
    (url) => api(url),
    { refreshInterval: 20000, revalidateOnFocus: true }
  );

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  async function markAllRead() {
    await api("/api/notifications", { method: "PATCH", json: { all: true } });
    mutate();
  }

  async function markRead(n: NotificationItem) {
    if (n.readAt) return;
    await api("/api/notifications", { method: "PATCH", json: { id: n.id } });
    mutate();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-88 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="h-84">
          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet. Updates about claims and listings appear here.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <a
                    href={n.linkUrl ?? "/notifications"}
                    onClick={() => markRead(n)}
                    className={cn("block px-4 py-3 transition-colors hover:bg-muted/60", !n.readAt && "bg-primary/[0.04]")}
                  >
                    <div className="flex items-start gap-2.5">
                      {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                      <div className={cn("min-w-0", n.readAt && "pl-4.5")}>
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs">
            <a href="/notifications">View all notifications</a>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
