import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from "lucide-react";

interface PipelineStage {
  id: string;
  name: string;
  icon: any;
  color: string;
  leads: any[];
  totalValue: number;
}

export function SalesPipeline() {
  const { user } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPipelineData();
    }
  }, [user]);

  const fetchPipelineData = async () => {
    try {
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('created_by', user?.id);

      const stageConfig = [
        { id: 'new_lead', name: 'Novos Leads', icon: AlertCircle, color: 'bg-blue-500' },
        { id: 'em_andamento', name: 'Em Andamento', icon: Clock, color: 'bg-yellow-500' },
        { id: 'aguardando_retorno', name: 'Aguardando', icon: TrendingUp, color: 'bg-purple-500' },
        { id: 'cliente_fechado', name: 'Fechados', icon: CheckCircle, color: 'bg-green-500' },
        { id: 'recusou_oferta', name: 'Perdidos', icon: XCircle, color: 'bg-red-500' },
      ];

      const pipelineStages = stageConfig.map(stage => {
        const stageLeads = (leads || []).filter((l: any) => l.status === stage.id);
        const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.valor_operacao || 0), 0);
        
        return {
          ...stage,
          leads: stageLeads,
          totalValue
        };
      });

      setStages(pipelineStages);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Pipeline de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div 
                key={stage.id}
                className="relative"
              >
                <Card className="border-l-4 hover:shadow-lg transition-shadow" style={{ borderLeftColor: `hsl(var(--primary))` }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${stage.color} bg-opacity-20`}>
                          <Icon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-')}`} />
                        </div>
                        <span className="font-medium text-sm">{stage.name}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{stage.leads.length}</span>
                        <Badge variant="secondary" className="text-xs">
                          leads
                        </Badge>
                      </div>
                      
                      {stage.totalValue > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(stage.totalValue)}
                          </span>
                        </div>
                      )}
                    </div>

                    {stage.leads.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {stage.leads.slice(0, 3).map((lead: any) => (
                          <div 
                            key={lead.id}
                            className="text-xs p-2 bg-muted/50 rounded truncate hover:bg-muted transition-colors cursor-pointer"
                            title={lead.name}
                          >
                            {lead.name}
                          </div>
                        ))}
                        {stage.leads.length > 3 && (
                          <div className="text-xs text-center text-muted-foreground">
                            +{stage.leads.length - 3} mais
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
