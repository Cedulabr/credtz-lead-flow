import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Filter, 
  Phone, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Star,
  MapPin,
  DollarSign,
  Target,
  TrendingUp,
  AlertCircle,
  Plus,
  Users,
  User
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  convenio: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  created_by?: string;
}

interface LeadRequest {
  convenio: string;
  count: number;
}

export function LeadsManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [remainingLeads, setRemainingLeads] = useState(30);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [leadRequest, setLeadRequest] = useState<LeadRequest>({
    convenio: "",
    count: 10
  });

  const statusConfig = {
    new_lead: { label: "Novo Lead", color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
    em_andamento: { label: "Em Andamento", color: "bg-yellow-500", textColor: "text-yellow-700", bgColor: "bg-yellow-50" },
    aguardando_retorno: { label: "Aguardando Retorno", color: "bg-purple-500", textColor: "text-purple-700", bgColor: "bg-purple-50" },
    cliente_fechado: { label: "Cliente Fechado", color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
    recusou_oferta: { label: "Recusou Oferta", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
    contato_futuro: { label: "Contato Futuro", color: "bg-gray-500", textColor: "text-gray-700", bgColor: "bg-gray-50" }
  };

  const conveniOptions = ["INSS", "SIAPE", "GOV BA", "Servidor Federal", "Servidor Estadual", "Servidor Municipal", "FGTS", "Forças Armadas"];

  useEffect(() => {
    if (user) {
      fetchLeads();
      checkDailyLimit();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive",
      });
    }
  };

  const checkDailyLimit = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_daily_lead_limit', { user_id_param: user?.id });

      if (error) throw error;
      setRemainingLeads(data || 0);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const requestLeads = async () => {
    if (!user) return;

    if (leadRequest.count > remainingLeads) {
      toast({
        title: "Limite excedido",
        description: `Você só pode solicitar ${remainingLeads} leads hoje.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('request_leads', {
          convenio_filter: leadRequest.convenio || null,
          banco_filter: null,
          produto_filter: null,
          leads_requested: leadRequest.count
        });

      if (error) throw error;

      // Convert the returned leads to our format and insert into leads table
      if (data && data.length > 0) {
        const leadsToInsert = data.map((lead: any) => ({
          name: lead.name,
          cpf: lead.cpf,
          phone: lead.phone,
          convenio: lead.convenio,
          status: 'new_lead',
          created_by: user.id,
          assigned_to: user.id,
          origem_lead: 'Sistema - Solicitação',
          banco_operacao: lead.banco,
          valor_operacao: null
        }));

        const { error: insertError } = await supabase
          .from('leads')
          .insert(leadsToInsert);

        if (insertError) throw insertError;

        toast({
          title: "Leads solicitados!",
          description: `${data.length} leads foram adicionados à sua lista.`,
        });

        setShowRequestDialog(false);
        fetchLeads();
        checkDailyLimit();
        
        // Reset form
        setLeadRequest({
          convenio: "",
          count: 10
        });
      } else {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads disponíveis com esses filtros.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error requesting leads:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      // Buscar o lead para obter o CPF
      const leadToUpdate = leads.find(l => l.id === leadId);
      
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      // Se o status for "recusou_oferta", adicionar à blacklist por 120 dias
      if (newStatus === 'recusou_oferta' && leadToUpdate?.cpf) {
        await supabase.rpc('add_lead_to_blacklist', {
          lead_cpf: leadToUpdate.cpf,
          blacklist_reason: 'recusou_oferta'
        });
        
        toast({
          title: "Lead movido para blacklist",
          description: "Este cliente não receberá ofertas por 120 dias.",
        });
      }

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      toast({
        title: "Status atualizado!",
        description: `Lead atualizado para: ${statusConfig[newStatus as keyof typeof statusConfig].label}`,
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do lead",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.cpf || "").includes(searchTerm) ||
                         (lead.phone || "").includes(searchTerm) ||
                         (lead.convenio || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new_lead").length,
    inProgress: leads.filter(l => ["em_andamento", "aguardando_retorno"].includes(l.status)).length,
    completed: leads.filter(l => ["cliente_fechado", "recusou_oferta"].includes(l.status)).length,
    remaining: remainingLeads
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Gerenciar Leads
            </h1>
            <p className="text-muted-foreground">
              Acompanhe e gerencie suas oportunidades de negócio
            </p>
          </div>
          
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Solicitar Leads
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Solicitar Novos Leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground">
                  Leads restantes hoje: <span className="font-semibold">{remainingLeads}</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Convênio</label>
                  <Select value={leadRequest.convenio} onValueChange={(value) => 
                    setLeadRequest(prev => ({ ...prev, convenio: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o convênio" />
                    </SelectTrigger>
                    <SelectContent>
                      {conveniOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantidade</label>
                  <Input
                    type="number"
                    min="1"
                    max="80"
                    value={leadRequest.count}
                    onChange={(e) => setLeadRequest(prev => ({ 
                      ...prev, 
                      count: Math.min(Number(e.target.value), 80, remainingLeads) 
                    }))}
                    placeholder="Número de leads (máx. 80)"
                  />
                </div>

                <Button 
                  onClick={requestLeads} 
                  disabled={isLoading || remainingLeads === 0}
                  className="w-full"
                >
                  {isLoading ? "Solicitando..." : "Solicitar Leads"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Leads</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.new}</p>
              <p className="text-sm text-muted-foreground">Novos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Finalizados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{stats.remaining}</p>
              <p className="text-sm text-muted-foreground">Restantes Hoje</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, telefone ou convênio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="new_lead">Novo Lead</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="aguardando_retorno">Aguardando Retorno</SelectItem>
                  <SelectItem value="cliente_fechado">Cliente Fechado</SelectItem>
                  <SelectItem value="recusou_oferta">Recusou Oferta</SelectItem>
                  <SelectItem value="contato_futuro">Contato Futuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => {
          const status = statusConfig[lead.status as keyof typeof statusConfig];
          
          return (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Lead Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {lead.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <User className="h-4 w-4" />
                          CPF: {lead.cpf}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${status?.textColor} ${status?.bgColor}`}>
                        {status?.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Convênio</p>
                        <p className="font-medium">{lead.convenio}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Telefone</p>
                        <p className="font-medium">{lead.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`tel:${lead.phone}`, '_self')}
                      className="flex-1 md:w-32"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Ligar
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}
                      className="flex-1 md:w-32"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>

                    <Select value={lead.status} onValueChange={(value) => updateLeadStatus(lead.id, value)}>
                      <SelectTrigger className="flex-1 md:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_lead">Novo Lead</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="aguardando_retorno">Aguardando Retorno</SelectItem>
                        <SelectItem value="cliente_fechado">Cliente Fechado</SelectItem>
                        <SelectItem value="recusou_oferta">Recusou Oferta</SelectItem>
                        <SelectItem value="contato_futuro">Contato Futuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum lead encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros ou solicitar novos leads.
            </p>
            <Button onClick={() => setShowRequestDialog(true)}>
              Solicitar Leads
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}