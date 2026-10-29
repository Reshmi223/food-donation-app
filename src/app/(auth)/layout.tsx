import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[oklch(0.954_0.0149_158.25)] dark:bg-[oklch(0.19_0.012_160)]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" aria-label="REMEAL home"><Logo size={38} /></Link>
        <ThemeToggle />
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-lg">{children}</div>
      </main>
      <footer className="relative z-10 pb-6 text-center text-xs text-muted-foreground">
        <p>Rescue Food. Restore Hope.</p>
      </footer>
    </div>
  );
}
