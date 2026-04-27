import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  score?: number | string | null;
  className?: string;
}

export function ScoreBadge({ score, className }: Props) {
  const n = typeof score === "string" ? Number(score.replace(/\D/g, "")) : Number(score ?? 0);
  if (!score && score !== 0) return <span className="text-muted-foreground">—</span>;
  let variant: "default" | "secondary" | "destructive" = "secondary";
  let label = "Médio";
  if (n < 300) {
    variant = "secondary";
    label = "Baixo";
  } else if (n >= 600) {
    variant = "destructive";
    label = "Alto";
  } else {
    variant = "default";
    label = "Médio";
  }
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="font-semibold">{n}</span>
      <Badge variant={variant}>{label}</Badge>
    </div>
  );
}
