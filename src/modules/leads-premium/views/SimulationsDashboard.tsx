import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calculator, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User,
  Phone,
  Building,
  Loader2,
  RefreshCcw,
  ChevronRight
} from "lucide-react";

interface SimulationRequest {
  id: string;
  lead_id: string;
  requested_by: string;
  requested_at: string;
  status: string;
  banco: string | null;
  produto: string | null;
  notes: string | null;
  valor_liberado: number | null;
  parcela: number | null;
  completed_at: string | null;
  completed_by: string | null;
  lead?: {
    name: string;
    cpf: string | null;
    phone: string;
    convenio: string;
  };
  requester?: {
    name: string | null;
    email: string | null;
  };
}

export function SimulationsDashboard() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [simulations, setSimulations] = useState<SimulationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [resultForm, setResultForm] = useState({
    valor_liberado: "",
    parcela: "",
    notes: ""
  });

  const isManager = profile?.role === 'admin';

  useEffect(() => {
    fetchSimulations();
  }, [user]);

  const fetchSimulations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activate_leads_simulations')
        .select(`
          *,
          lead:activate_leads(name:nome, cpf, phone:telefone, convenio:produto)
        `)
        .order('requested_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSimulations(data || []);
    } catch (error) {
      console.error('Error fetching simulations:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar simulações",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const pending = simulations.filter(s => s.status === 'pending').length;
    const completed = simulations.filter(s => s.status === 'completed').length;
    const today = simulations.filter(s => {
      const date = new Date(s.requested_at);
      const todayDate = new Date();
      return date.toDateString() === todayDate.toDateString();
    }).length;

    return { pending, completed, today, total: simulations.length };
  }, [simulations]);

  const handleCompleteSimulation = async () => {
    if (!selectedSimulation) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('activate_leads_simulations')
        .update({
          status: 'completed',
          valor_liberado: resultForm.valor_liberado ? parseFloat(resultForm.valor_liberado) : null,
          parcela: resultForm.parcela ? parseFloat(resultForm.parcela) : null,
          notes: resultForm.notes || selectedSimulation.notes,
          completed_at: new Date().toISOString(),
          completed_by: user?.id
        })
        .eq('id', selectedSimulation.id);

      if (error) throw error;

      // Update lead simulation status
      await supabase
        .from('activate_leads')
        .update({
          simulation_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSimulation.lead_id);

      toast({
        title: "Simulação concluída!",
        description: "O consultor será notificado do resultado."
      });

      setSelectedSimulation(null);
      setResultForm({ valor_liberado: "", parcela: "", notes: "" });
      fetchSimulations();
    } catch (error: any) {
      console.error('Error completing simulation:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao concluir simulação",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingSimulations = simulations.filter(s => s.status === 'pending');
  const completedSimulations = simulations.filter(s => s.status === 'completed');

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Stats */}
      <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} border-b bg-muted/30`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Simulações</h2>
          <Button variant="ghost" size="sm" onClick={fetchSimulations}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xl font-bold text-amber-700">{stats.pending}</p>
            <p className="text-[10px] text-amber-600">Pendentes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-xl font-bold text-emerald-700">{stats.completed}</p>
            <p className="text-[10px] text-emerald-600">Concluídas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xl font-bold text-blue-700">{stats.today}</p>
            <p className="text-[10px] text-blue-600">Hoje</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xl font-bold text-purple-700">{stats.total}</p>
            <p className="text-[10px] text-purple-600">Total</p>
          </div>
        </div>
      </div>

      {/* Simulations List */}
      <ScrollArea className="flex-1">
        <div className={`${isMobile ? 'px-4 py-3' : 'p-4'} space-y-4`}>
          {/* Pending Section */}
          {pendingSimulations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700">
                <Clock className="h-4 w-4" />
                Aguardando ({pendingSimulations.length})
              </h3>
              {pendingSimulations.map((sim, index) => (
                <motion.div
                  key={sim.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="border-l-4 border-l-amber-500 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedSimulation(sim);
                      setResultForm({ valor_liberado: "", parcela: "", notes: sim.notes || "" });
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{sim.lead?.name || 'Cliente'}</p>
                            <Badge variant="outline" className="text-xs">
                              {sim.banco || 'Banco não definido'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <Phone className="inline h-3 w-3 mr-1" />
                            {sim.lead?.phone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Solicitado {format(new Date(sim.requested_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {sim.notes && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {sim.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Completed Section */}
          {completedSimulations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                Concluídas ({completedSimulations.length})
              </h3>
              {completedSimulations.slice(0, 10).map((sim, index) => (
                <motion.div
                  key={sim.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="border-l-4 border-l-emerald-500 opacity-80">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{sim.lead?.name || 'Cliente'}</p>
                          <div className="flex gap-2">
                            {sim.valor_liberado && (
                              <Badge variant="secondary" className="text-xs">
                                R$ {sim.valor_liberado.toLocaleString('pt-BR')}
                              </Badge>
                            )}
                            {sim.parcela && (
                              <Badge variant="outline" className="text-xs">
                                {sim.parcela}x
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Concluído {format(new Date(sim.completed_at!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {simulations.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma simulação
                </p>
                <p className="text-sm text-muted-foreground">
                  As simulações solicitadas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Process Simulation Sheet */}
      <Sheet open={!!selectedSimulation} onOpenChange={() => setSelectedSimulation(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[80vh]" : ""}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Processar Simulação
            </SheetTitle>
          </SheetHeader>
          
          {selectedSimulation && (
            <div className="py-4 space-y-4">
              {/* Client Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{selectedSimulation.lead?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {selectedSimulation.lead?.phone}
                </div>
                {selectedSimulation.banco && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="secondary">{selectedSimulation.banco}</Badge>
                    {selectedSimulation.produto && (
                      <Badge variant="outline">{selectedSimulation.produto}</Badge>
                    )}
                  </div>
                )}
              </div>

              {selectedSimulation.notes && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">Observações do consultor:</p>
                  <p className="text-sm text-amber-800">{selectedSimulation.notes}</p>
                </div>
              )}

              {/* Result Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor Liberado (R$)</Label>
                    <Input
                      placeholder="0,00"
                      value={resultForm.valor_liberado}
                      onChange={(e) => setResultForm(prev => ({ ...prev, valor_liberado: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parcela</Label>
                    <Input
                      placeholder="84"
                      value={resultForm.parcela}
                      onChange={(e) => setResultForm(prev => ({ ...prev, parcela: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações do Resultado</Label>
                  <Textarea
                    placeholder="Detalhes da simulação..."
                    value={resultForm.notes}
                    onChange={(e) => setResultForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button 
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleCompleteSimulation}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir Simulação
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}