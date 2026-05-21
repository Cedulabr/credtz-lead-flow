import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreditBadge({ balance }: { balance: number }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
      balance > 0 ? "bg-primary/5 border-primary/20 text-primary" : "bg-destructive/10 border-destructive/30 text-destructive"
    )}>
      <CreditCard className="h-4 w-4" />
      <span className="text-sm font-semibold">{balance}</span>
      <span className="text-xs opacity-80">créditos</span>
    </div>
  );
}
