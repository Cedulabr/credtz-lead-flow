import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
  User,
  Phone,
  Building,
  Loader2,
  RefreshCcw,
  ChevronRight,
  FileText,
  Send
} from "lucide-react";
import { Lead } from "../types";

interface SimulationLead extends Lead {
  requester_name?: string;
}

export function SimulationsDashboard() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<SimulationLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<SimulationLead | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [resultForm, setResultForm] = useState({
    valor_operacao: "",
    banco_operacao: "",
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
      // Buscar leads que têm simulação solicitada (simulation_status não é null)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .not('simulation_status', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLeads(data || []);
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
    const solicitada = leads.filter(l => l.simulation_status === 'solicitada').length;
    const enviada = leads.filter(l => l.simulation_status === 'enviada').length;
    const concluida = leads.filter(l => l.simulation_status === 'concluida').length;
    const today = leads.filter(l => {
      const date = new Date(l.updated_at || l.created_at);
      const todayDate = new Date();
      return date.toDateString() === todayDate.toDateString();
    }).length;

    return { solicitada, enviada, concluida, today, total: leads.length };
  }, [leads]);

  const handleUpdateSimulation = async (newStatus: string) => {
    if (!selectedLead) return;

    setIsProcessing(true);
    try {
      const updateData: any = {
        simulation_status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Se for concluída, adicionar os valores
      if (newStatus === 'concluida' || newStatus === 'enviada') {
        if (resultForm.valor_operacao) {
          updateData.valor_operacao = parseFloat(resultForm.valor_operacao);
        }
        if (resultForm.banco_operacao) {
          updateData.banco_operacao = resultForm.banco_operacao;
        }
        if (resultForm.notes) {
          updateData.notes = resultForm.notes;
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) throw error;

      toast({
        title: newStatus === 'enviada' ? "Simulação enviada!" : "Simulação concluída!",
        description: "O status foi atualizado com sucesso."
      });

      setSelectedLead(null);
      setResultForm({ valor_operacao: "", banco_operacao: "", notes: "" });
      fetchSimulations();
    } catch (error: any) {
      console.error('Error updating simulation:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar simulação",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Agrupar leads por status de simulação
  const solicitadas = leads.filter(l => l.simulation_status === 'solicitada');
  const enviadas = leads.filter(l => l.simulation_status === 'enviada');
  const concluidas = leads.filter(l => l.simulation_status === 'concluida');

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
            <p className="text-xl font-bold text-amber-700">{stats.solicitada}</p>
            <p className="text-[10px] text-amber-600">Solicitadas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xl font-bold text-blue-700">{stats.enviada}</p>
            <p className="text-[10px] text-blue-600">Enviadas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-xl font-bold text-emerald-700">{stats.concluida}</p>
            <p className="text-[10px] text-emerald-600">Concluídas</p>
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
          {/* Solicitadas Section */}
          {solicitadas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-700">
                <Clock className="h-4 w-4" />
                Aguardando Simulação ({solicitadas.length})
              </h3>
              {solicitadas.map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="border-l-4 border-l-amber-500 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedLead(lead);
                      setResultForm({ 
                        valor_operacao: lead.valor_operacao?.toString() || "", 
                        banco_operacao: lead.banco_operacao || "",
                        notes: lead.notes || "" 
                      });
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{lead.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {lead.convenio || 'INSS'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <Phone className="inline h-3 w-3 mr-1" />
                            {lead.phone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Atualizado {format(new Date(lead.updated_at || lead.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {lead.notes && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded line-clamp-2">
                          {lead.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Enviadas Section */}
          {enviadas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-700">
                <Send className="h-4 w-4" />
                Simulações Enviadas ({enviadas.length})
              </h3>
              {enviadas.map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card 
                    className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedLead(lead);
                      setResultForm({ 
                        valor_operacao: lead.valor_operacao?.toString() || "", 
                        banco_operacao: lead.banco_operacao || "",
                        notes: lead.notes || "" 
                      });
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{lead.name}</p>
                          <div className="flex gap-2">
                            {lead.valor_operacao && (
                              <Badge variant="secondary" className="text-xs">
                                R$ {lead.valor_operacao.toLocaleString('pt-BR')}
                              </Badge>
                            )}
                            {lead.banco_operacao && (
                              <Badge variant="outline" className="text-xs">
                                {lead.banco_operacao}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <Phone className="inline h-3 w-3 mr-1" />
                            {lead.phone}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Concluidas Section */}
          {concluidas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                Concluídas ({concluidas.length})
              </h3>
              {concluidas.slice(0, 10).map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="border-l-4 border-l-emerald-500 opacity-80">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{lead.name}</p>
                          <div className="flex gap-2">
                            {lead.valor_operacao && (
                              <Badge variant="secondary" className="text-xs">
                                R$ {lead.valor_operacao.toLocaleString('pt-BR')}
                              </Badge>
                            )}
                            {lead.banco_operacao && (
                              <Badge variant="outline" className="text-xs">
                                {lead.banco_operacao}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Atualizado {format(new Date(lead.updated_at || lead.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
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

          {leads.length === 0 && (
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
      <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[85vh]" : ""}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Processar Simulação
            </SheetTitle>
            <SheetDescription>
              Preencha os dados da simulação e atualize o status
            </SheetDescription>
          </SheetHeader>
          
          {selectedLead && (
            <div className="py-4 space-y-4">
              {/* Client Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{selectedLead.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {selectedLead.phone}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{selectedLead.convenio || 'INSS'}</Badge>
                  <Badge 
                    variant="outline"
                    className={
                      selectedLead.simulation_status === 'solicitada' ? 'bg-amber-50 text-amber-700' :
                      selectedLead.simulation_status === 'enviada' ? 'bg-blue-50 text-blue-700' :
                      'bg-emerald-50 text-emerald-700'
                    }
                  >
                    {selectedLead.simulation_status === 'solicitada' ? 'Aguardando' :
                     selectedLead.simulation_status === 'enviada' ? 'Enviada' : 'Concluída'}
                  </Badge>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">Observações:</p>
                  <p className="text-sm text-amber-800">{selectedLead.notes}</p>
                </div>
              )}

              {/* Result Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor Liberado (R$)</Label>
                    <Input
                      placeholder="0,00"
                      value={resultForm.valor_operacao}
                      onChange={(e) => setResultForm(prev => ({ ...prev, valor_operacao: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input
                      placeholder="Ex: Bradesco"
                      value={resultForm.banco_operacao}
                      onChange={(e) => setResultForm(prev => ({ ...prev, banco_operacao: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Detalhes da simulação..."
                    value={resultForm.notes}
                    onChange={(e) => setResultForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {selectedLead.simulation_status === 'solicitada' && (
                    <Button 
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleUpdateSimulation('enviada')}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Marcar como Enviada
                        </>
                      )}
                    </Button>
                  )}

                  {(selectedLead.simulation_status === 'solicitada' || selectedLead.simulation_status === 'enviada') && (
                    <Button 
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleUpdateSimulation('concluida')}
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
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
