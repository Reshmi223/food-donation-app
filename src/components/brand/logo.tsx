import { cn } from "@/lib/utils";

/**
 * REMEAL brand mark — a leaf (food/nature) resting over a food bowl,
 * bridged by a connection arc symbolizing donor ↔ community linkage.
 */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="REMEAL logo"
    >
      {/* bowl */}
      <path
        d="M9 26h30c0 7.5-5.2 13.4-12.5 14.8l-.5 2.2h-4l-.5-2.2C14.2 39.4 9 33.5 9 26Z"
        className="fill-[#176B45] dark:fill-[#5BBF8A]"
      />
      <path d="M7 26.5h34" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-[#0F4D30] dark:text-[#9AD8B6]" />
      {/* connection / bridge arc */}
      <path
        d="M12 21c4-7.5 20-7.5 24 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="0.5 4.4"
        className="text-[#2E8B57] dark:text-[#5BBF8A]"
      />
      {/* leaf */}
      <path
        d="M24 4c6.5 2.6 9.8 8 9.4 14.6-6.7 1-12.4-2.3-14.6-8.9C18 7 20 4.8 24 4Z"
        className="fill-[#2E8B57] dark:fill-[#5BBF8A]"
      />
      <path
        d="M20.2 12.4c2.4 2.9 5.4 5 9 6.2"
        stroke="#F7FAF7"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="dark:stroke-[#10261B]"
      />
    </svg>
  );
}

export function Logo({
  className,
  size = 36,
  showTagline = false,
}: {
  className?: string;
  size?: number;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-bold tracking-tight text-xl text-primary">
          RE<span className="text-secondary">MEAL</span>
        </span>
        {showTagline && (
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5 tracking-wide">
            Rescue Food. Restore Hope.
          </span>
        )}
      </span>
    </span>
  );
}
