import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Clock,
  CheckCircle,
  FileText,
  User,
  Phone,
  Loader2,
  Send,
  TrendingUp,
  FileCheck,
  DollarSign,
  CreditCard,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActivateLeadSimulations, SimulationWithDetails, SimulationStats, SimulationFormData } from "@/hooks/useActivateLeadSimulations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivateSimulationManagerProps {
  onUpdate?: () => void;
}

const PRODUCTS = [
  { id: "novo", label: "Novo", emoji: "🆕", color: "bg-emerald-500" },
  { id: "refinanciamento", label: "Refinanciamento", emoji: "💰", color: "bg-amber-500" },
  { id: "portabilidade", label: "Portabilidade", emoji: "🔄", color: "bg-blue-500" },
  { id: "cartao", label: "Cartão", emoji: "💳", color: "bg-purple-500" },
];

const formatCurrency = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  const amount = parseInt(numbers || "0", 10) / 100;
  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatCurrencyDisplay = (value: number | null): string => {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ActivateSimulationManager({ onUpdate }: ActivateSimulationManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    isGestorOrAdmin,
    getPendingSimulations,
    getAwaitingConfirmation,
    getSimulationStats,
    completeSimulation,
    confirmSimulation,
  } = useActivateLeadSimulations();

  const [pendingSimulations, setPendingSimulations] = useState<SimulationWithDetails[]>([]);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<SimulationWithDetails[]>([]);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationWithDetails | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const [formData, setFormData] = useState<SimulationFormData>({
    produto: "",
    parcela: "",
    valor_liberado: "",
    banco: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pending, awaiting, statsData] = await Promise.all([
        isGestorOrAdmin ? getPendingSimulations() : Promise.resolve([]),
        getAwaitingConfirmation(),
        isGestorOrAdmin ? getSimulationStats() : Promise.resolve(null)
      ]);
      
      setPendingSimulations(pending);
      setAwaitingConfirmation(awaiting);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isGestorOrAdmin]);

  const handleCompleteSimulation = async () => {
    if (!selectedSimulation || !user) return;

    if (!formData.produto) {
      toast({ title: "Selecione o produto", variant: "destructive" });
      return;
    }
    if (!formData.parcela) {
      toast({ title: "Informe a parcela", variant: "destructive" });
      return;
    }
    if (!formData.valor_liberado) {
      toast({ title: "Informe o valor liberado", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      await completeSimulation(
        selectedSimulation.id,
        selectedSimulation.lead_id,
        formData,
        selectedSimulation.requested_by,
        selectedSimulation.lead?.nome || 'Cliente'
      );

      toast({
        title: "✅ Simulação Enviada!",
        description: "O usuário foi notificado e pode visualizar os valores.",
      });

      setIsCompleteModalOpen(false);
      setFormData({ produto: "", parcela: "", valor_liberado: "", banco: "" });
      setSelectedSimulation(null);
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error completing simulation:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao enviar simulação",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmSimulation = async () => {
    if (!selectedSimulation || !user) return;

    setIsConfirming(true);
    try {
      await confirmSimulation(
        selectedSimulation.id,
        selectedSimulation.lead_id,
        selectedSimulation.completed_by || '',
        selectedSimulation.lead?.nome || 'Cliente'
      );

      toast({
        title: "📬 Recebimento Confirmado!",
        description: "A simulação foi marcada como recebida.",
      });

      setIsViewModalOpen(false);
      setSelectedSimulation(null);
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error confirming simulation:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao confirmar recebimento",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getProductInfo = (productId: string) => {
    return PRODUCTS.find(p => p.id === productId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const hasPending = pendingSimulations.length > 0;
  const hasAwaiting = awaitingConfirmation.length > 0;
  const hasStats = stats && (stats.todayRequested > 0 || stats.todayCompleted > 0 || stats.pending > 0);

  if (!hasPending && !hasAwaiting && !hasStats) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Stats Cards for Gestor */}
        {isGestorOrAdmin && stats && hasStats && (
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-violet-600" />
                📊 Simulações Activate Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-white dark:bg-background rounded-lg p-3 shadow-sm border border-amber-100 dark:border-amber-900">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Pendentes</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.pending}</p>
                </div>
                
                <div className="bg-white dark:bg-background rounded-lg p-3 shadow-sm border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium">Em Andamento</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.inProgress}</p>
                </div>
                
                <div className="bg-white dark:bg-background rounded-lg p-3 shadow-sm border border-emerald-100 dark:border-emerald-900">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <Send className="h-4 w-4" />
                    <span className="text-xs font-medium">Enviadas</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.completed}</p>
                </div>
                
                <div className="bg-white dark:bg-background rounded-lg p-3 shadow-sm border border-green-100 dark:border-green-900">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <FileCheck className="h-4 w-4" />
                    <span className="text-xs font-medium">Recebidas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.received}</p>
                </div>
                
                <div className="bg-white dark:bg-background rounded-lg p-3 shadow-sm border border-violet-100 dark:border-violet-900">
                  <div className="flex items-center gap-2 text-violet-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Hoje</span>
                  </div>
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">
                    {stats.todayRequested}/{stats.todayCompleted}
                  </p>
                  <p className="text-xs text-muted-foreground">Solic./Resp.</p>
                </div>
                
                <div className="bg-white dark:bg-background rounded-lg p-3 shadow-sm border border-purple-100 dark:border-purple-900">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Conversão</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Simulations (Gestor View) */}
        {isGestorOrAdmin && hasPending && (
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  <Clock className="h-4 w-4 text-white" />
                </motion.div>
                📋 Simulações Pendentes (Activate)
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  {pendingSimulations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {pendingSimulations.map((sim, index) => (
                  <motion.div
                    key={sim.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-background rounded-lg p-4 shadow-sm border border-amber-100 dark:border-amber-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">
                            {sim.lead?.nome || 'Cliente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(sim.lead?.telefone || '')}
                          </span>
                          {sim.lead?.cpf && (
                            <Badge variant="outline" className="text-xs">
                              CPF: {sim.lead.cpf}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Solicitado por {sim.requester?.name || 'Usuário'} em{' '}
                          {format(new Date(sim.requested_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSimulation(sim);
                          setFormData({ produto: "", parcela: "", valor_liberado: "", banco: "" });
                          setIsCompleteModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Simular
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}

        {/* Awaiting Confirmation (User View) */}
        {hasAwaiting && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500"
                >
                  <Send className="h-4 w-4 text-white" />
                </motion.div>
                ✅ Simulações Prontas (Activate)
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {awaitingConfirmation.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {awaitingConfirmation.map((sim, index) => {
                  const productInfo = getProductInfo(sim.produto || '');
                  return (
                    <motion.div
                      key={sim.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white dark:bg-background rounded-lg p-4 shadow-sm border border-emerald-100 dark:border-emerald-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium truncate">
                              {sim.lead?.nome || 'Cliente'}
                            </span>
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {productInfo && (
                              <Badge className={`${productInfo.color} text-white`}>
                                {productInfo.emoji} {productInfo.label}
                              </Badge>
                            )}
                            {sim.banco && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {sim.banco}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrencyDisplay(sim.valor_liberado)}
                            </span>
                            <span className="flex items-center gap-1 text-blue-600">
                              <CreditCard className="h-4 w-4" />
                              {formatCurrencyDisplay(sim.parcela)}/mês
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSimulation(sim);
                            setIsViewModalOpen(true);
                          }}
                          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Complete Simulation Modal */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              📊 Responder Simulação
            </DialogTitle>
            <DialogDescription>
              Cliente: {selectedSimulation?.lead?.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select
                value={formData.produto}
                onValueChange={(value) => setFormData({ ...formData, produto: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      <span className="flex items-center gap-2">
                        {prod.emoji} {prod.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Banco</Label>
              <Input
                placeholder="Nome do banco"
                value={formData.banco}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parcela *</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={formData.parcela}
                  onChange={(e) => setFormData({ ...formData, parcela: formatCurrency(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Liberado *</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={formData.valor_liberado}
                  onChange={(e) => setFormData({ ...formData, valor_liberado: formatCurrency(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCompleteSimulation}
              disabled={isSending}
              className="bg-gradient-to-r from-amber-500 to-orange-500"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Simulação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Confirm Simulation Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              ✅ Confirmar Recebimento
            </DialogTitle>
            <DialogDescription>
              Cliente: {selectedSimulation?.lead?.nome}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSimulation && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {getProductInfo(selectedSimulation.produto || '') && (
                    <Badge className={`${getProductInfo(selectedSimulation.produto || '')?.color} text-white`}>
                      {getProductInfo(selectedSimulation.produto || '')?.emoji}{' '}
                      {getProductInfo(selectedSimulation.produto || '')?.label}
                    </Badge>
                  )}
                  {selectedSimulation.banco && (
                    <Badge variant="outline">
                      <Building2 className="h-3 w-3 mr-1" />
                      {selectedSimulation.banco}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Liberado</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrencyDisplay(selectedSimulation.valor_liberado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parcela</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrencyDisplay(selectedSimulation.parcela)}/mês
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Ao confirmar, você indica que recebeu e visualizou a simulação.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
            <Button 
              onClick={handleConfirmSimulation}
              disabled={isConfirming}
              className="bg-gradient-to-r from-emerald-500 to-green-500"
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
