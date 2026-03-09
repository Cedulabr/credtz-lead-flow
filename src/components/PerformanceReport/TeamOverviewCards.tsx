import { Eye, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UserPerformance, ActivityStatus } from "./types";
import { cn } from "@/lib/utils";

interface TeamOverviewCardsProps {
  data: UserPerformance[];
  onViewDetails: (userId: string, userName: string) => void;
  teamAvgConversion: number;
}

const statusConfig: Record<ActivityStatus, { label: string; dot: string; border: string }> = {
  active: { label: "Ativo", dot: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-800" },
  warning: { label: "Alerta", dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800" },
  critical: { label: "Crítico", dot: "bg-rose-500", border: "border-rose-200 dark:border-rose-800" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export function TeamOverviewCards({ data, onViewDetails, teamAvgConversion }: TeamOverviewCardsProps) {
  const sorted = [...data].sort((a, b) => b.proposalsPaid - a.proposalsPaid);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {sorted.map((user, idx) => {
        const cfg = statusConfig[user.activityStatus];
        return (
          <Card
            key={user.userId}
            className={cn(
              "p-4 transition-all hover:shadow-md cursor-pointer relative",
              cfg.border
            )}
            onClick={() => onViewDetails(user.userId, user.userName)}
          >
            {/* Medal or rank */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {idx < 3 ? medals[idx] : user.userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user.userName}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                    <span className="text-xs text-muted-foreground">{cfg.label}</span>
                    {user.daysSinceLastActivity > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        · {user.daysSinceLastActivity}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <p className="text-lg font-bold text-foreground">{user.proposalsPaid}</p>
                <p className="text-[10px] text-muted-foreground">pagas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(user.totalSold)}</p>
                <p className="text-[10px] text-muted-foreground">vendido</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {user.premiumLeads + user.activatedLeads}
                </p>
                <p className="text-[10px] text-muted-foreground">leads</p>
              </div>
            </div>

            {/* Conversion bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Conversão
                </span>
                <span className="font-semibold">{user.conversionRate.toFixed(0)}%</span>
              </div>
              <Progress value={user.conversionRate} className="h-1.5" />
              {teamAvgConversion > 0 && (
                <p className="text-[10px] text-muted-foreground text-right">
                  média: {teamAvgConversion.toFixed(0)}%
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
