import { useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertTriangle, Clock, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { format, isBefore, addDays, isAfter } from "date-fns";

interface Transaction {
  id: string;
  description: string;
  value: number;
  due_date: string;
  status: string;
  type: string;
}

interface FinanceAlertsProps {
  transactions: Transaction[];
  companyId: string;
}

export const FinanceAlerts = ({ transactions, companyId }: FinanceAlertsProps) => {
  const parseDateSafe = (dateStr: string) => {
    // date column comes as YYYY-MM-DD; parse as local date to avoid timezone shifts
    if (dateStr && dateStr.length === 10) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  };

  const alerts = useMemo(() => {

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = addDays(today, 3);

    const overdue = transactions.filter(t => 
      t.status !== "pago" && 
      isBefore(parseDateSafe(t.due_date), today)
    );
    
    const dueSoon = transactions.filter(t => 
      t.status !== "pago" && 
      isAfter(parseDateSafe(t.due_date), today) && 
      isBefore(parseDateSafe(t.due_date), threeDaysFromNow)
    );
    
    const totalExpenses = transactions
      .filter(t => t.type === "despesa")
      .reduce((sum, t) => sum + Number(t.value), 0);
    
    const totalCommissions = transactions
      .filter(t => t.type === "comissao")
      .reduce((sum, t) => sum + Number(t.value), 0);
    
    const paidCount = transactions.filter(t => t.status === "pago").length;
    const pendingCount = transactions.filter(t => t.status === "pendente").length;
    
    return {
      overdue,
      dueSoon,
      totalExpenses,
      totalCommissions,
      balance: totalCommissions - totalExpenses,
      paidCount,
      pendingCount,
      totalCount: transactions.length,
    };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (transactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overdue Alert */}
      {alerts.overdue.length > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  {alerts.overdue.length} conta{alerts.overdue.length > 1 ? "s" : ""} vencida{alerts.overdue.length > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Total: {formatCurrency(alerts.overdue.reduce((sum, t) => sum + Number(t.value), 0))}
                </p>
                <div className="mt-2 space-y-1">
                  {alerts.overdue.slice(0, 3).map(t => (
                    <p key={t.id} className="text-xs text-red-600 truncate">
                      • {t.description}
                    </p>
                  ))}
                  {alerts.overdue.length > 3 && (
                    <p className="text-xs text-red-600">
                      +{alerts.overdue.length - 3} mais...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Soon Alert */}
      {alerts.dueSoon.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  {alerts.dueSoon.length} conta{alerts.dueSoon.length > 1 ? "s" : ""} vencendo em breve
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  Total: {formatCurrency(alerts.dueSoon.reduce((sum, t) => sum + Number(t.value), 0))}
                </p>
                <div className="mt-2 space-y-1">
                  {alerts.dueSoon.slice(0, 3).map(t => (
                    <p key={t.id} className="text-xs text-yellow-600 truncate">
                      • {t.description} ({format(parseDateSafe(t.due_date), "dd/MM")})
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Despesas do Mês</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(alerts.totalExpenses)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {alerts.pendingCount} pendentes
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {alerts.paidCount} pagas
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commissions Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Comissões do Mês</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(alerts.totalCommissions)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={alerts.balance >= 0 ? "default" : "destructive"} 
                  className="text-xs"
                >
                  Saldo: {formatCurrency(alerts.balance)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
