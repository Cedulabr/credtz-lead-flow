import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Building2, Package, Percent, Crown, Calculator, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CommissionRule {
  id: string;
  company_id: string | null;
  bank_name: string;
  product_name: string;
  operation_type: string | null;
  user_level: string;
  calculation_model: string;
  commission_type: string;
  commission_value: number;
  secondary_commission_value: number | null;
  description: string | null;
  is_active: boolean;
}

const levelConfig: Record<string, { label: string; color: string }> = {
  bronze: { label: "Bronze", color: "bg-amber-700 text-white" },
  prata: { label: "Prata", color: "bg-gray-400 text-gray-900" },
  ouro: { label: "Ouro", color: "bg-yellow-500 text-yellow-900" },
  diamante: { label: "Diamante", color: "bg-cyan-400 text-cyan-900" },
};

const calculationModelLabels: Record<string, string> = {
  saldo_devedor: "Saldo Devedor",
  valor_bruto: "Valor Bruto",
  ambos: "Saldo + Bruto",
};

export function CommissionTable() {
  const { user, profile, isAdmin } = useAuth();
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  const userLevel = profile?.level || "bronze";

  useEffect(() => {
    fetchUserCompany();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCommissionRules();
    }
  }, [userLevel, isAdmin, userCompanyId]);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('commission-rules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_rules'
        },
        () => {
          fetchCommissionRules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLevel, isAdmin, userCompanyId]);

  const fetchUserCompany = async () => {
    if (!user || isAdmin) return;

    try {
      const { data } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (data) {
        setUserCompanyId(data.company_id);
      }
    } catch (error) {
      console.error('Erro ao buscar empresa do usuário:', error);
    }
  };

  const fetchCommissionRules = async () => {
    try {
      setLoading(true);
      
      // Fetch from commission_rules (Regras Flexíveis)
      let query = supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true)
        .order('bank_name', { ascending: true })
        .order('product_name', { ascending: true });

      // Filter by user level (non-admin)
      if (!isAdmin && userLevel) {
        query = query.eq('user_level', userLevel);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter rules: show global rules (company_id = null) or rules for user's company
      const filteredRules = (data || []).filter(rule => {
        // Admins see all
        if (isAdmin) return true;
        // Global rules (no company restriction)
        if (!rule.company_id) return true;
        // Rules for user's company
        if (userCompanyId && rule.company_id === userCompanyId) return true;
        return false;
      });

      setCommissionRules(filteredRules);
    } catch (error) {
      console.error('Erro ao buscar tabela de comissões:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group rules by bank
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
        <CardContent className="flex justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentLevelConfig = levelConfig[userLevel] || levelConfig.bronze;

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Percent className="h-4 w-4 md:h-5 md:w-5" />
                Tabela de Comissões
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {isAdmin 
                  ? "Visualizando todas as comissões (Admin)"
                  : `Comissões disponíveis para seu nível`
                }
              </p>
            </div>
            {!isAdmin && (
              <Badge className={`${currentLevelConfig.color} flex items-center gap-1 text-xs`}>
                <Crown className="h-3 w-3" />
                {currentLevelConfig.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {Object.keys(groupedByBank).length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Nenhuma comissão cadastrada para seu nível
            </p>
          ) : (
            <div className="space-y-6 md:space-y-8">
              {Object.entries(groupedByBank).map(([bankName, rules]) => (
                <div key={bankName} className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <h3 className="text-base md:text-lg font-semibold">{bankName}</h3>
                  </div>
                  
                  {/* Mobile: Card layout */}
                  <div className="block md:hidden space-y-3">
                    {rules.map((rule) => (
                      <div key={rule.id} className="p-3 border rounded-lg bg-card space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{rule.product_name}</span>
                          </div>
                          <Badge variant="default" className="font-semibold text-xs">
                            {rule.commission_type === 'percentage' 
                              ? `${rule.commission_value}%`
                              : `R$ ${rule.commission_value.toFixed(2)}`
                            }
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rule.operation_type ? (
                            <Badge variant="outline" className="text-xs">{rule.operation_type}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Padrão</span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {calculationModelLabels[rule.calculation_model] || rule.calculation_model}
                          </Badge>
                        </div>
                        {rule.secondary_commission_value && rule.calculation_model === 'ambos' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calculator className="h-3 w-3" />
                            <span>Adicional:</span>
                            <Badge variant="outline" className="font-semibold text-xs">
                              +{rule.commission_type === 'percentage' 
                                ? `${rule.secondary_commission_value}%`
                                : `R$ ${rule.secondary_commission_value.toFixed(2)}`
                              }
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Desktop: Table layout */}
                  <div className="hidden md:block rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Produto
                            </div>
                          </TableHead>
                          <TableHead>Operação</TableHead>
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <Calculator className="h-3 w-3" />
                              Cálculo
                            </div>
                          </TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium">
                              {rule.product_name}
                            </TableCell>
                            <TableCell>
                              {rule.operation_type ? (
                                <Badge variant="outline">{rule.operation_type}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Padrão</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {calculationModelLabels[rule.calculation_model] || rule.calculation_model}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="default" className="font-semibold">
                                {rule.commission_type === 'percentage' 
                                  ? `${rule.commission_value}%`
                                  : `R$ ${rule.commission_value.toFixed(2)}`
                                }
                              </Badge>
                              {rule.secondary_commission_value && rule.calculation_model === 'ambos' && (
                                <Badge variant="outline" className="ml-1 font-semibold">
                                  +{rule.commission_type === 'percentage' 
                                    ? `${rule.secondary_commission_value}%`
                                    : `R$ ${rule.secondary_commission_value.toFixed(2)}`
                                  }
                                </Badge>
                              )}
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
        <CardContent className="p-4 md:pt-6">
          <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
            <p className="font-medium text-foreground">ℹ️ Como funciona:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Saldo Devedor:</strong> Comissão calculada sobre o saldo devedor da operação</li>
              <li><strong>Valor Bruto:</strong> Comissão calculada sobre o valor bruto total</li>
              <li><strong>Saldo + Bruto:</strong> Duas comissões aplicadas separadamente</li>
              <li>Os valores são atualizados automaticamente pelo administrador</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}