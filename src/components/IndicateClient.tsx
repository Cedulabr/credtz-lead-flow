import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  UserPlus, 
  Send,
  Sparkles,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IndicatedClient {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  convenio: string;
  status: string;
  observacoes?: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  lead_digitado: { label: 'Enviado', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: Clock },
  oferta_aprovada: { label: 'Aprovado', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  oferta_recusada: { label: 'Recusado', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
  oferta_paga: { label: 'Pago', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', icon: DollarSign }
};

export function IndicateClient() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("indicate");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    observations: ""
  });
  
  // Tracking state
  const [clients, setClients] = useState<IndicatedClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (user && activeTab === "tracking") {
      fetchClients();
    }
  }, [user, activeTab]);

  const fetchClients = async () => {
    if (!user) return;
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('leads_indicados')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d{1,4})/, "$1-$2")
      .substring(0, 15);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para indicar clientes.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('leads_indicados')
        .insert({
          nome: formData.name,
          cpf: '',
          telefone: formData.phone.replace(/\D/g, ""),
          convenio: 'Indicação Geral',
          observacoes: formData.observations,
          status: 'lead_digitado',
          created_by: user.id
        });

      if (insertError) throw insertError;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      toast({
        title: "Indicação enviada! 🎉",
        description: "Você receberá atualizações sobre o status.",
      });

      setFormData({ name: "", phone: "", observations: "" });
      fetchClients();
    } catch (error) {
      console.error('Erro ao enviar indicação:', error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountry}`, '_blank');
  };

  const formatPhoneDisplay = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
    }
    return phone;
  };

  const isFormValid = formData.name.length >= 3 && formData.phone.replace(/\D/g, "").length >= 10;

  // Stats calculation
  const stats = {
    total: clients.length,
    approved: clients.filter(c => c.status === 'oferta_aprovada').length,
    paid: clients.filter(c => c.status === 'oferta_paga').length,
    pending: clients.filter(c => c.status === 'lead_digitado').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-24 md:pb-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative px-4 py-8 md:py-12">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Indique e Ganhe
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-foreground"
            >
              Transforme Conexões em <span className="text-primary">Oportunidades</span>
            </motion.h1>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-lg max-w-md mx-auto"
            >
              Cada indicação é uma chance de aumentar sua renda. Simples, rápido e recompensador.
            </motion.p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50 backdrop-blur">
            <TabsTrigger 
              value="indicate" 
              className="h-12 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Nova Indicação
            </TabsTrigger>
            <TabsTrigger 
              value="tracking" 
              className="h-12 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Minhas Indicações
              {clients.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {clients.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Indicate Form Tab */}
          <TabsContent value="indicate" className="mt-6 space-y-6">
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800">Indicação enviada!</p>
                    <p className="text-sm text-emerald-600">Acompanhe o status na aba "Minhas Indicações"</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-medium">
                      Nome do Cliente
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Digite o nome completo"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="h-14 text-base bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-base font-medium">
                      WhatsApp
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", formatPhone(e.target.value))}
                        className="h-14 text-base pl-12 bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20"
                        maxLength={15}
                        required
                      />
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="space-y-2">
                    <Label htmlFor="observations" className="text-base font-medium">
                      Observações <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Textarea
                      id="observations"
                      placeholder="Alguma informação relevante sobre o cliente..."
                      value={formData.observations}
                      onChange={(e) => handleInputChange("observations", e.target.value)}
                      className="min-h-[100px] text-base bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.observations.length}/500
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Enviando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Send className="w-5 h-5" />
                        Enviar Indicação
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50 rounded-2xl p-5 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-foreground">Ganhe Comissões</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Por cada proposta fechada
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Acompanhe</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Status em tempo real
                </p>
              </motion.div>
            </div>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="mt-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="border-0 bg-muted/50">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                  <p className="text-xs text-blue-600/70">Pendentes</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-emerald-50">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                  <p className="text-xs text-emerald-600/70">Aprovados</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-purple-50">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-purple-600">{stats.paid}</p>
                  <p className="text-xs text-purple-600/70">Pagos</p>
                </CardContent>
              </Card>
            </div>

            {/* Clients List */}
            {loadingClients ? (
              <Card className="border-0 bg-card/80">
                <CardContent className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3 animate-spin" />
                  <p className="text-muted-foreground">Carregando indicações...</p>
                </CardContent>
              </Card>
            ) : clients.length === 0 ? (
              <Card className="border-0 bg-card/80">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma indicação ainda</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece indicando seu primeiro cliente!
                  </p>
                  <Button onClick={() => setActiveTab("indicate")} variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Fazer Indicação
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {clients.map((client, index) => {
                  const status = statusConfig[client.status] || statusConfig.lead_digitado;
                  const StatusIcon = status.icon;
                  
                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`border ${status.bgColor} hover:shadow-md transition-all`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${status.bgColor}`}>
                                <StatusIcon className={`w-5 h-5 ${status.color}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">{client.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatPhoneDisplay(client.telefone)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${status.color} border-current`}>
                                {status.label}
                              </Badge>
                              
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 rounded-full hover:bg-primary/10"
                                  onClick={() => window.open(`tel:${client.telefone}`, '_self')}
                                >
                                  <Phone className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 rounded-full hover:bg-emerald-500/10 text-emerald-600"
                                  onClick={() => openWhatsApp(client.telefone)}
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {client.observacoes && (
                            <p className="text-sm text-muted-foreground mt-3 pt-3 border-t">
                              {client.observacoes}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            Indicado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Refresh Button */}
            {clients.length > 0 && (
              <div className="text-center">
                <Button 
                  variant="ghost" 
                  onClick={fetchClients}
                  disabled={loadingClients}
                  className="text-muted-foreground"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingClients ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}