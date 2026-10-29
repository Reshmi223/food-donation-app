// Small typed fetch wrapper for client components.
export async function api<T = unknown>(
  url: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = options ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error || `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const absMin = Math.abs(diffMs) / 60000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), "minute");
  if (absMin < 60 * 24) return rtf.format(Math.round(diffMs / 3600000), "hour");
  if (absMin < 60 * 24 * 30) return rtf.format(Math.round(diffMs / 86400000), "day");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
