"use client";

import useSWR from "swr";
import { api } from "@/lib/api-client";

export type SessionUser = {
  id: string;
  email: string;
  role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN";
  displayName: string;
  organizationName?: string | null;
  verificationStatus: string;
  avatarUrl?: string | null;
};

const fetcher = (url: string) => api<SessionUser | null>(url);

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<SessionUser | null>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  return { user: data ?? null, isLoading, error, refresh: mutate };
}

export function dashboardPathForRole(role?: string | null): string {
  switch (role) {
    case "DONOR": return "/dashboard/donor";
    case "NGO": return "/dashboard/ngo";
    case "VOLUNTEER": return "/dashboard/volunteer";
    case "ADMIN": return "/dashboard/admin";
    default: return "/login";
  }
}
