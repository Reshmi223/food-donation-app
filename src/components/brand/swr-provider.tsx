"use client";

import { SWRConfig } from "swr";

/** Client-side SWR defaults — must live in a client component because the
 *  fetcher function cannot be passed from a server component. */
export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        async fetcher(url: string) {
          const res = await fetch(url, { credentials: "same-origin" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw Object.assign(new Error(data?.error || "Request failed"), { status: res.status });
          }
          return data;
        },
        revalidateOnFocus: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
