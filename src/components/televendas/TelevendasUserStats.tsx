import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { STATUS_CONFIG } from "./TelevendasFilters";
import { useState } from "react";

interface Televenda {
  id: string;
  nome: string;
  cpf: string;
  status: string;
  user_id: string;
  user?: { name: string } | null;
  parcela: number;
}

interface UserStatsProps {
  televendas: Televenda[];
  onUserClick?: (userId: string) => void;
  isGestorOrAdmin: boolean;
}

interface UserStatsData {
  userId: string;
  userName: string;
  total: number;
  digitados: number;
  pagosAprovados: number;
  pagosAguardando: number;
  cancelados: number;
  pendentes: number;
  valorTotal: number;
}

export const TelevendasUserStats = ({
  televendas,
  onUserClick,
  isGestorOrAdmin
}: UserStatsProps) => {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const userStats = useMemo(() => {
    const statsMap = new Map<string, UserStatsData>();

    televendas.forEach((tv) => {
      const userId = tv.user_id;
      const userName = tv.user?.name || "Sem usuário";

      if (!statsMap.has(userId)) {
        statsMap.set(userId, {
          userId,
          userName,
          total: 0,
          digitados: 0,
          pagosAprovados: 0,
          pagosAguardando: 0,
          cancelados: 0,
          pendentes: 0,
          valorTotal: 0,
        });
      }

      const stats = statsMap.get(userId)!;
      stats.total++;
      stats.valorTotal += tv.parcela || 0;

      // Count by status
      switch (tv.status) {
        case "proposta_digitada":
        case "solicitado_digitacao":
          stats.digitados++;
          break;
        case "pago_aprovado":
        case "pago":
          stats.pagosAprovados++;
          break;
        case "pago_aguardando":
          stats.pagosAguardando++;
          break;
        case "cancelado_confirmado":
        case "cancelado":
        case "cancelado_aguardando":
          stats.cancelados++;
          break;
        case "pendente":
        case "devolvido":
          stats.pendentes++;
          break;
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.total - a.total);
  }, [televendas]);

  const totals = useMemo(() => {
    return userStats.reduce(
      (acc, stats) => ({
        total: acc.total + stats.total,
        digitados: acc.digitados + stats.digitados,
        pagosAprovados: acc.pagosAprovados + stats.pagosAprovados,
        pagosAguardando: acc.pagosAguardando + stats.pagosAguardando,
        cancelados: acc.cancelados + stats.cancelados,
        pendentes: acc.pendentes + stats.pendentes,
        valorTotal: acc.valorTotal + stats.valorTotal,
      }),
      {
        total: 0,
        digitados: 0,
        pagosAprovados: 0,
        pagosAguardando: 0,
        cancelados: 0,
        pendentes: 0,
        valorTotal: 0,
      }
    );
  }, [userStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!isGestorOrAdmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary totals */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumo por Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="text-center p-3 rounded-lg bg-background/60 border">
              <div className="text-2xl font-bold text-foreground">{totals.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-600">{totals.digitados}</div>
              <div className="text-xs text-muted-foreground">📝 Digitados</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-600">{totals.pagosAguardando}</div>
              <div className="text-xs text-muted-foreground">⏳ Aguard. Gestão</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-600">{totals.pagosAprovados}</div>
              <div className="text-xs text-muted-foreground">✅ Pagos</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="text-2xl font-bold text-orange-600">{totals.pendentes}</div>
              <div className="text-xs text-muted-foreground">⚠️ Pendentes</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-2xl font-bold text-red-600">{totals.cancelados}</div>
              <div className="text-xs text-muted-foreground">❌ Cancelados</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-600 text-sm md:text-lg">
                {formatCurrency(totals.valorTotal)}
              </div>
              <div className="text-xs text-muted-foreground">💰 Valor Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-user breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Estatísticas por Operador
            <Badge variant="secondary" className="ml-2">
              {userStats.length} usuários
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {userStats.map((stats, index) => (
                <motion.div
                  key={stats.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* User header - clickable */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      setExpandedUser(expandedUser === stats.userId ? null : stats.userId);
                      onUserClick?.(stats.userId);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">{stats.userName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stats.total} proposta{stats.total !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    
                    {/* Quick stats badges */}
                    <div className="flex items-center gap-2">
                      <div className="hidden md:flex items-center gap-2">
                        {stats.pagosAprovados > 0 && (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            ✅ {stats.pagosAprovados}
                          </Badge>
                        )}
                        {stats.pagosAguardando > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse">
                            ⏳ {stats.pagosAguardando}
                          </Badge>
                        )}
                        {stats.pendentes > 0 && (
                          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            ⚠️ {stats.pendentes}
                          </Badge>
                        )}
                        {stats.cancelados > 0 && (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                            ❌ {stats.cancelados}
                          </Badge>
                        )}
                      </div>
                      
                      {expandedUser === stats.userId ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedUser === stats.userId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t"
                    >
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        <div className="text-center p-2 rounded-lg bg-blue-500/10">
                          <div className="text-lg font-bold text-blue-600">{stats.digitados}</div>
                          <div className="text-xs text-muted-foreground">📝 Digitados</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-amber-500/10">
                          <div className="text-lg font-bold text-amber-600">{stats.pagosAguardando}</div>
                          <div className="text-xs text-muted-foreground">⏳ Aguardando</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-green-500/10">
                          <div className="text-lg font-bold text-green-600">{stats.pagosAprovados}</div>
                          <div className="text-xs text-muted-foreground">✅ Pagos</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-orange-500/10">
                          <div className="text-lg font-bold text-orange-600">{stats.pendentes}</div>
                          <div className="text-xs text-muted-foreground">⚠️ Pendentes</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-red-500/10">
                          <div className="text-lg font-bold text-red-600">{stats.cancelados}</div>
                          <div className="text-xs text-muted-foreground">❌ Cancelados</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                          <div className="text-lg font-bold text-emerald-600 text-sm">
                            {formatCurrency(stats.valorTotal)}
                          </div>
                          <div className="text-xs text-muted-foreground">💰 Valor</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};
