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
import { Checkbox } from "@/components/ui/checkbox";
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
  Eye,
  Send,
  AlertCircle,
  TrendingUp,
  FileCheck,
  ArrowRight,
  DollarSign,
  CreditCard,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSimulationNotifications, SimulationWithDetails, SimulationStats, SimulationFormData, SimulationContractItem } from "@/hooks/useSimulationNotifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SimulationManagerProps {
  onUpdate?: () => void;
}

const PRODUCTS = [
  { id: "novo", label: "Novo", emoji: "🆕", color: "bg-emerald-500" },
  { id: "refinanciamento", label: "Refinanciamento", emoji: "💰", color: "bg-amber-500" },
  { id: "portabilidade", label: "Portabilidade", emoji: "🔄", color: "bg-blue-500" },
  { id: "cartao", label: "Cartão", emoji: "💳", color: "bg-purple-500" },
  { id: "margem", label: "Margem", emoji: "📈", color: "bg-cyan-500" },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const createEmptyContract = (): SimulationContractItem => ({
  id: generateId(),
  produto: "",
  parcela: "",
  valor_liberado: "",
  banco: "",
});

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

export function SimulationManager({ onUpdate }: SimulationManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    isGestorOrAdmin,
    getPendingSimulations,
    getAwaitingConfirmation,
    getSimulationStats,
    completeSimulation,
    confirmSimulation,
    requestDigitacao,
  } = useSimulationNotifications();

  const [pendingSimulations, setPendingSimulations] = useState<SimulationWithDetails[]>([]);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<SimulationWithDetails[]>([]);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationWithDetails | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDigitacaoModalOpen, setIsDigitacaoModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRequestingDigitacao, setIsRequestingDigitacao] = useState(false);
  const [confirmFollowSimulation, setConfirmFollowSimulation] = useState(false);
  
  // Multiple contracts state
  const [contracts, setContracts] = useState<SimulationContractItem[]>([createEmptyContract()]);

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

  const addContract = () => {
    setContracts(prev => [...prev, createEmptyContract()]);
  };

  const removeContract = (id: string) => {
    if (contracts.length === 1) {
      toast({ title: "Pelo menos um contrato é necessário", variant: "destructive" });
      return;
    }
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  const updateContract = (id: string, field: keyof SimulationContractItem, value: string) => {
    setContracts(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleCompleteSimulation = async () => {
    if (!selectedSimulation || !user) return;

    // Validate contracts
    const invalidContract = contracts.find(c => !c.produto || !c.parcela || !c.valor_liberado);
    if (invalidContract) {
      toast({ title: "Preencha todos os campos obrigatórios em cada contrato", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      await completeSimulation(
        selectedSimulation.id,
        selectedSimulation.lead_id,
        contracts,
        selectedSimulation.requested_by,
        selectedSimulation.lead?.name || 'Cliente'
      );

      toast({
        title: "✅ Simulação Enviada!",
        description: `${contracts.length} contrato(s) enviado(s) com sucesso.`,
      });

      setIsCompleteModalOpen(false);
      setContracts([createEmptyContract()]);
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

  const handleConfirmAndDigitacao = async () => {
    if (!selectedSimulation || !user) return;

    setIsConfirming(true);
    try {
      await confirmSimulation(
        selectedSimulation.id,
        selectedSimulation.lead_id,
        selectedSimulation.completed_by || '',
        selectedSimulation.lead?.name || 'Cliente'
      );

      toast({
        title: "📬 Recebimento Confirmado!",
        description: "Agora você pode solicitar a digitação.",
      });

      setIsViewModalOpen(false);
      setIsDigitacaoModalOpen(true);
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

  const handleRequestDigitacao = async () => {
    if (!selectedSimulation || !user || !confirmFollowSimulation) return;

    setIsRequestingDigitacao(true);
    try {
      await requestDigitacao(
        selectedSimulation.lead_id,
        selectedSimulation.id,
        {
          name: selectedSimulation.lead?.name || '',
          cpf: selectedSimulation.lead?.cpf || '',
          phone: selectedSimulation.lead?.phone || '',
          convenio: selectedSimulation.lead?.convenio || ''
        },
        selectedSimulation.simulation_file_url || undefined
      );

      toast({
        title: "📝 Digitação Solicitada!",
        description: "O lead foi enviado para Gestão Televendas com o histórico da simulação.",
      });

      setIsDigitacaoModalOpen(false);
      setSelectedSimulation(null);
      setConfirmFollowSimulation(false);
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error requesting digitação:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao solicitar digitação",
        variant: "destructive",
      });
    } finally {
      setIsRequestingDigitacao(false);
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
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-violet-600" />
                Métricas de Simulações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm border border-amber-100">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Pendentes</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-medium">Em Andamento</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <Send className="h-4 w-4" />
                    <span className="text-xs font-medium">Enviadas</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{stats.completed}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm border border-green-100">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <FileCheck className="h-4 w-4" />
                    <span className="text-xs font-medium">Recebidas</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{stats.received}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm border border-violet-100">
                  <div className="flex items-center gap-2 text-violet-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Hoje</span>
                  </div>
                  <p className="text-2xl font-bold text-violet-700">
                    {stats.todayRequested}/{stats.todayCompleted}
                  </p>
                  <p className="text-xs text-gray-500">Solic./Resp.</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Conversão</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{stats.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Simulations (Gestor View) */}
        {isGestorOrAdmin && hasPending && (
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  <Clock className="h-4 w-4 text-white" />
                </motion.div>
                Simulações Pendentes
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
                    className="bg-white rounded-lg p-4 shadow-sm border border-amber-100"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 truncate">
                            {sim.lead?.name || 'Cliente'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhone(sim.lead?.phone || '')}
                          </span>
                          {sim.lead?.convenio && (
                            <Badge variant="outline" className="text-xs">
                              {sim.lead.convenio}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Solicitado por {sim.requester?.name || 'Usuário'} em{' '}
                          {format(new Date(sim.requested_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSimulation(sim);
                          setContracts([createEmptyContract()]);
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
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500"
                >
                  <Send className="h-4 w-4 text-white" />
                </motion.div>
                Simulações Prontas
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
                      className="bg-white rounded-lg p-4 shadow-sm border border-emerald-100"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 truncate">
                              {sim.lead?.name || 'Cliente'}
                            </span>
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          </div>
                          
                          {/* Show simulation details */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {productInfo && (
                              <Badge className={`${productInfo.color} text-white text-xs`}>
                                {productInfo.emoji} {productInfo.label}
                              </Badge>
                            )}
                            {sim.parcela && (
                              <Badge variant="outline" className="text-xs">
                                Parcela: {formatCurrencyDisplay(sim.parcela)}
                              </Badge>
                            )}
                            {sim.valor_liberado && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                💰 {formatCurrencyDisplay(sim.valor_liberado)}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-2">
                            Concluída em{' '}
                            {sim.completed_at && format(new Date(sim.completed_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSimulation(sim);
                              setIsViewModalOpen(true);
                            }}
                            className="border-emerald-200 text-emerald-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedSimulation(sim);
                              setIsViewModalOpen(true);
                            }}
                            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Digitar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Complete Simulation Modal - Multiple Contracts */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-600" />
              Responder Simulação
            </DialogTitle>
            <DialogDescription>
              Adicione os contratos da simulação para o cliente
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Client Info */}
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-800">
                Cliente: {selectedSimulation?.lead?.name}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Solicitado por: {selectedSimulation?.requester?.name}
              </p>
            </div>

            {/* Contracts List */}
            <div className="space-y-4">
              {contracts.map((contract, index) => (
                <div key={contract.id} className="border border-amber-200 rounded-lg p-4 bg-white relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-amber-700">
                      Contrato {index + 1}
                    </Badge>
                    {contracts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContract(contract.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    )}
                  </div>

                  {/* Product Selection */}
                  <div className="space-y-2 mb-3">
                    <Label className="text-xs">Produto *</Label>
                    <div className="grid grid-cols-5 gap-1">
                      {PRODUCTS.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => updateContract(contract.id, 'produto', product.id)}
                          className={`
                            p-2 rounded-lg border text-center transition-all text-xs
                            ${contract.produto === product.id
                              ? 'border-amber-500 bg-amber-50 shadow-md'
                              : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                            }
                          `}
                        >
                          <span className="text-lg">{product.emoji}</span>
                          <p className="text-[10px] font-medium mt-0.5">{product.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Banco */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Banco
                      </Label>
                      <Input
                        placeholder="Nome do banco"
                        value={contract.banco}
                        onChange={(e) => updateContract(contract.id, 'banco', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Parcela */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Parcela *
                      </Label>
                      <Input
                        placeholder="R$ 0,00"
                        value={contract.parcela}
                        onChange={(e) => updateContract(contract.id, 'parcela', formatCurrency(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Valor Liberado */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        Valor Lib. *
                      </Label>
                      <Input
                        placeholder="R$ 0,00"
                        value={contract.valor_liberado}
                        onChange={(e) => updateContract(contract.id, 'valor_liberado', formatCurrency(e.target.value))}
                        className="h-8 text-sm text-green-700"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Contract Button */}
            <Button
              type="button"
              variant="outline"
              onClick={addContract}
              className="w-full border-dashed border-amber-400 text-amber-600 hover:bg-amber-50"
            >
              + Adicionar Contrato
            </Button>

            {/* Summary */}
            {contracts.length > 0 && contracts.some(c => c.valor_liberado) && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">
                    Total ({contracts.length} contrato{contracts.length > 1 ? 's' : ''}):
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    {formatCurrency(
                      String(
                        contracts.reduce((sum, c) => {
                          const val = parseFloat(c.valor_liberado.replace(/\D/g, '')) || 0;
                          return sum + val;
                        }, 0)
                      )
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCompleteModalOpen(false);
                setContracts([createEmptyContract()]);
              }}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteSimulation}
              disabled={contracts.some(c => !c.produto || !c.parcela || !c.valor_liberado) || isSending}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar {contracts.length} Contrato{contracts.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View & Confirm Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Simulação Pronta - Solicitar Digitação
            </DialogTitle>
            <DialogDescription>
              Confira os valores e confirme para solicitar digitação
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Client Info */}
            <div className="bg-emerald-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-800">
                Cliente: {selectedSimulation?.lead?.name}
              </p>
              {selectedSimulation?.lead?.phone && (
                <p className="text-xs text-emerald-600">
                  Telefone: {formatPhone(selectedSimulation.lead.phone)}
                </p>
              )}
              {selectedSimulation?.lead?.convenio && (
                <Badge variant="outline" className="text-xs">
                  {selectedSimulation.lead.convenio}
                </Badge>
              )}
            </div>

            {/* Simulation Details */}
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Detalhes da Simulação
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                {selectedSimulation?.produto && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Produto</p>
                    <p className="font-medium">
                      {getProductInfo(selectedSimulation.produto)?.emoji}{' '}
                      {getProductInfo(selectedSimulation.produto)?.label || selectedSimulation.produto}
                    </p>
                  </div>
                )}
                
                {selectedSimulation?.banco && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Banco</p>
                    <p className="font-medium">{selectedSimulation.banco}</p>
                  </div>
                )}
                
                {selectedSimulation?.parcela && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Parcela</p>
                    <p className="font-medium text-blue-700">
                      {formatCurrencyDisplay(selectedSimulation.parcela)}
                    </p>
                  </div>
                )}
                
                {selectedSimulation?.valor_liberado && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-green-600">Valor Liberado</p>
                    <p className="font-bold text-green-700 text-lg">
                      {formatCurrencyDisplay(selectedSimulation.valor_liberado)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Ao solicitar digitação:
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• O lead será enviado para Gestão Televendas</li>
                <li>• O histórico da simulação ficará anexado</li>
                <li>• O gestor poderá acompanhar a proposta</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsViewModalOpen(false)}
              disabled={isConfirming}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAndDigitacao}
              disabled={isConfirming}
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Confirmar e Solicitar Digitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Digitação Confirmation Modal */}
      <Dialog open={isDigitacaoModalOpen} onOpenChange={setIsDigitacaoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-violet-600" />
              Confirmar Digitação
            </DialogTitle>
            <DialogDescription>
              Confirme que seguirá as propostas da simulação
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-violet-50 rounded-lg p-4">
              <p className="text-sm font-medium text-violet-800">
                Cliente: {selectedSimulation?.lead?.name}
              </p>
              <p className="text-xs text-violet-600 mt-1">
                A proposta será enviada para Gestão Televendas
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirm-simulation"
                  checked={confirmFollowSimulation}
                  onCheckedChange={(checked) => setConfirmFollowSimulation(checked === true)}
                  className="mt-1"
                />
                <div>
                  <Label 
                    htmlFor="confirm-simulation" 
                    className="text-sm font-medium text-amber-800 cursor-pointer"
                  >
                    Confirmo que seguirei todas as propostas informadas na simulação
                  </Label>
                  <p className="text-xs text-amber-600 mt-1">
                    Ao marcar, você confirma que as condições apresentadas na simulação serão mantidas na proposta.
                  </p>
                </div>
              </div>
            </div>

            {!confirmFollowSimulation && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>Você precisa confirmar que seguirá as propostas da simulação para continuar.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDigitacaoModalOpen(false);
                setConfirmFollowSimulation(false);
              }}
              disabled={isRequestingDigitacao}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRequestDigitacao}
              disabled={!confirmFollowSimulation || isRequestingDigitacao}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            >
              {isRequestingDigitacao ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Televendas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
