import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserPerformance } from "./types";

interface TeamRankingProps {
  data: UserPerformance[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const medals = [
  { emoji: "🥇", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
  { emoji: "🥈", bg: "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800" },
  { emoji: "🥉", bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800" },
];

export function TeamRanking({ data }: TeamRankingProps) {
  const sorted = [...data].sort((a, b) => b.totalSold - a.totalSold);
  const top = sorted.slice(0, 3);
  const maxSold = top[0]?.totalSold || 1;

  if (top.length === 0) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Top Vendedores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.map((user, idx) => {
          const medal = medals[idx];
          const pct = (user.totalSold / maxSold) * 100;
          return (
            <div key={user.userId} className={`p-3 rounded-lg border ${medal.bg}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{medal.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.proposalsPaid} pagas · {user.conversionRate.toFixed(0)}% conversão
                  </p>
                </div>
                <p className="font-bold text-emerald-600 text-sm shrink-0">
                  {formatCurrency(user.totalSold)}
                </p>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
