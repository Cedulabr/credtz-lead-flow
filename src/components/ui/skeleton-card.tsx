import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  variant?: "card" | "list" | "form" | "table" | "stat";
  count?: number;
  className?: string;
}

function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  );
}

export function SkeletonCard({ variant = "card", count = 1, className }: SkeletonCardProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "stat") {
    return (
      <div className={cn("grid gap-4", className)}>
        {items.map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl bg-card border p-4 md:p-6"
          >
            <ShimmerOverlay />
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-32 rounded-md bg-muted animate-pulse mb-2" />
            <div className="h-3 w-20 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {items.map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg bg-card border p-4 flex items-center gap-4"
          >
            <ShimmerOverlay />
            <div className="h-12 w-12 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("space-y-6", className)}>
        {items.map((i) => (
          <div key={i} className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded-md bg-muted animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 rounded-md bg-muted animate-pulse" />
              <div className="h-24 w-full rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border", className)}>
        <ShimmerOverlay />
        {/* Header */}
        <div className="bg-muted/50 p-4 border-b flex gap-4">
          {[1, 2, 3, 4].map((col) => (
            <div key={col} className="h-4 flex-1 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        {/* Rows */}
        {items.map((i) => (
          <div key={i} className="p-4 border-b last:border-0 flex gap-4">
            {[1, 2, 3, 4].map((col) => (
              <div key={col} className="h-4 flex-1 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default card
  return (
    <div className={cn("grid gap-4", className)}>
      {items.map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl bg-card border p-6"
        >
          <ShimmerOverlay />
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-muted animate-pulse" />
              </div>
            </div>
            <div className="h-20 w-full rounded-lg bg-muted animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
              <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl bg-card border p-4"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <ShimmerOverlay />
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-24 rounded bg-muted animate-pulse mb-1" />
          <div className="h-2 w-12 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card border p-4 md:p-6 h-[300px]">
      <ShimmerOverlay />
      <div className="h-4 w-32 rounded bg-muted animate-pulse mb-4" />
      <div className="flex items-end gap-2 h-[220px]">
        {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-muted animate-pulse"
            style={{ 
              height: `${height}%`,
              animationDelay: `${i * 0.05}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="min-w-[280px] space-y-3">
          <div className="h-6 w-24 rounded bg-muted animate-pulse mb-4" />
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="relative overflow-hidden rounded-lg bg-card border p-4"
            >
              <ShimmerOverlay />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse mb-2" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse mb-3" />
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded bg-muted animate-pulse" />
                <div className="h-6 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
