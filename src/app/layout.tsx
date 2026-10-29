import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/brand/theme-provider";
import { SwrProvider } from "@/components/brand/swr-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "REMEAL — The Intelligent Food Rescue Network",
    template: "%s · REMEAL",
  },
  description:
    "REMEAL connects restaurants, hotels and event organizers with verified NGOs and volunteers to rescue safe surplus food. Rescue Food. Restore Hope.",
  keywords: ["food rescue", "food waste", "surplus food", "NGO", "Tamil Nadu", "food donation", "REMEAL"],
  authors: [{ name: "REMEAL" }],
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "REMEAL — Rescue Food. Restore Hope.",
    description: "Connecting surplus food with communities that need it.",
    siteName: "REMEAL",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7FAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#10261B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SwrProvider>
            {children}
          </SwrProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
