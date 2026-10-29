"use client";

import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ART: Record<string, { emoji: string; bg: string }> = {
  PREPARED_MEALS: { emoji: "🍛", bg: "from-[oklch(0.95_0.02_145)] to-[oklch(0.88_0.05_145)]" },
  BAKERY: { emoji: "🥖", bg: "from-[oklch(0.96_0.03_75)] to-[oklch(0.9_0.06_70)]" },
  FRUITS_VEGETABLES: { emoji: "🥗", bg: "from-[oklch(0.95_0.03_150)] to-[oklch(0.86_0.08_150)]" },
  PACKAGED: { emoji: "🥫", bg: "from-[oklch(0.95_0.02_250)] to-[oklch(0.88_0.04_250)]" },
  DAIRY: { emoji: "🥛", bg: "from-[oklch(0.97_0.01_100)] to-[oklch(0.9_0.03_100)]" },
  BEVERAGES: { emoji: "🧃", bg: "from-[oklch(0.94_0.04_40)] to-[oklch(0.87_0.07_40)]" },
  GRAINS_STAPLES: { emoji: "🌾", bg: "from-[oklch(0.95_0.03_85)] to-[oklch(0.89_0.05_85)]" },
  DESSERTS: { emoji: "🍮", bg: "from-[oklch(0.95_0.04_15)] to-[oklch(0.88_0.07_15)]" },
  OTHER: { emoji: "🍽️", bg: "from-[oklch(0.95_0.015_155)] to-[oklch(0.88_0.04_155)]" },
};

/**
 * Renders an uploaded food photo when available (via authorized upload route),
 * otherwise a friendly category illustration. No external image dependencies.
 */
export function FoodImage({
  imageId,
  category,
  alt,
  className,
}: {
  imageId?: string;
  category: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const art = CATEGORY_ART[category] ?? CATEGORY_ART.OTHER;

  if (imageId && !failed) {
    return (
      <img
        src={`/api/uploads/${imageId}`}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("flex items-center justify-center bg-gradient-to-br", art.bg, className)}
    >
      <span className="text-5xl opacity-90" aria-hidden>{art.emoji}</span>
      <UtensilsCrossed className="absolute -bottom-2 -right-2 h-10 w-10 text-primary/10" aria-hidden />
    </div>
  );
}
