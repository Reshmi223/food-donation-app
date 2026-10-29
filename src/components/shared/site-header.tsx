"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, HeartHandshake } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession, dashboardPathForRole } from "@/hooks/use-session";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/explore", label: "Explore Food" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Help" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSession();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="REMEAL home" className="shrink-0">
          <Logo size={34} />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                pathname === item.href && "bg-muted text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                        {(user.displayName ?? user.email).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-28 truncate text-sm font-medium lg:inline">
                      {user.displayName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="truncate text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashboardPathForRole(user.role)}>Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/notifications">Notifications</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} variant="destructive">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="gap-1.5">
                <Link href="/register">
                  <HeartHandshake className="h-4 w-4" />
                  Get Started
                </Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Mobile navigation" className="border-t bg-background px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted",
                    pathname === item.href && "bg-muted text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {!user && (
              <li className="flex gap-2 pt-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/register" onClick={() => setMobileOpen(false)}>Get Started</Link>
                </Button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
