import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Building2, Package, Percent, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CommissionRule {
  id: string;
  bank_name: string;
  product_name: string;
  term: string | null;
  table_name: string | null;
  commission_percentage: number;
  user_percentage: number;
  user_percentage_profile: string | null;
  is_active: boolean;
}

const levelConfig: Record<string, { label: string; color: string }> = {
  bronze: { label: "Bronze", color: "bg-amber-700 text-white" },
  prata: { label: "Prata", color: "bg-gray-400 text-gray-900" },
  ouro: { label: "Ouro", color: "bg-yellow-500 text-yellow-900" },
  diamante: { label: "Diamante", color: "bg-cyan-400 text-cyan-900" },
};

export function CommissionTable() {
  const { profile, isAdmin } = useAuth();
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);

  const userLevel = profile?.level || "bronze";

  useEffect(() => {
    fetchCommissionRules();
  }, [userLevel, isAdmin]);

  const fetchCommissionRules = async () => {
    try {
      let query = supabase
        .from('commission_table')
        .select('*')
        .eq('is_active', true)
        .order('bank_name', { ascending: true })
        .order('product_name', { ascending: true });

      // Admins see all, regular users see only their level
      if (!isAdmin && userLevel) {
        query = query.eq('user_percentage_profile', userLevel);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommissionRules(data || []);
    } catch (error) {
      console.error('Erro ao buscar tabela de comissões:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar comissões por banco
  const groupedByBank = commissionRules.reduce((acc, rule) => {
    if (!acc[rule.bank_name]) {
      acc[rule.bank_name] = [];
    }
    acc[rule.bank_name].push(rule);
    return acc;
  }, {} as Record<string, CommissionRule[]>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Tabela de Comissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const currentLevelConfig = levelConfig[userLevel] || levelConfig.bronze;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Tabela de Comissões
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin 
                  ? "Visualizando todas as comissões (Admin)"
                  : `Comissões disponíveis para seu nível`
                }
              </p>
            </div>
            {!isAdmin && (
              <Badge className={`${currentLevelConfig.color} flex items-center gap-1`}>
                <Crown className="h-3 w-3" />
                {currentLevelConfig.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedByBank).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma comissão cadastrada
            </p>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedByBank).map(([bankName, rules]) => (
                <div key={bankName} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{bankName}</h3>
                  </div>
                  
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Produto
                            </div>
                          </TableHead>
                          <TableHead>Tabela</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead className="text-right">Repasse Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium">
                              {rule.product_name}
                            </TableCell>
                            <TableCell>
                              {rule.table_name ? (
                                <Badge variant="outline">{rule.table_name}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule.term ? (
                                <Badge variant="outline">{rule.term}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Todos</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="default" className="font-semibold">
                                {rule.user_percentage}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">ℹ️ Como funciona:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Comissão Total:</strong> Percentual pago pelo banco sobre o valor da operação</li>
              <li><strong>Seu Repasse:</strong> Percentual que você recebe da comissão total</li>
              <li>Os valores são calculados automaticamente ao lançar uma comissão</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
