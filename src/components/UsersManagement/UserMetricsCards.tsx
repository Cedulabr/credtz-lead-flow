import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Crown, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserData, UserCompany } from "./types";
import { cn } from "@/lib/utils";

interface UserMetricsCardsProps {
  users: UserData[];
  userCompanies: Record<string, UserCompany>;
  loading: boolean;
}

export function UserMetricsCards({ users, userCompanies, loading }: UserMetricsCardsProps) {
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active !== false).length;
    const gestores = Object.values(userCompanies).filter(uc => uc.company_role === 'gestor').length;
    const colaboradores = Object.values(userCompanies).filter(uc => uc.company_role === 'colaborador').length;
    return { total, active, gestores, colaboradores };
  }, [users, userCompanies]);

  const cards = [
    { label: "Total de Usuários", value: metrics.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Usuários Ativos", value: metrics.active, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Gestores", value: metrics.gestores, icon: Crown, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: "Colaboradores", value: metrics.colaboradores, icon: User, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="border border-border/50 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.label}
              </span>
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", card.bg)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
