import { cn } from "@/lib/utils";

export function ScoreBar({ score }: { score: number | null | undefined }) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const color =
    value >= 80
      ? "bg-emerald-600"
      : value >= 60
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
        {value}
      </span>
    </div>
  );
}
