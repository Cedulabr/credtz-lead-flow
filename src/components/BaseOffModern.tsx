import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Filter, 
  Search, 
  Database, 
  Users, 
  TrendingUp, 
  DollarSign,
  Phone,
  MessageCircle,
  Star,
  Download,
  RefreshCw,
  User,
  Target,
  Sparkles
} from "lucide-react";

interface BaseOffLead {
  CPF: string;
  Nome: string;
  Telefone1?: string;
  Telefone2?: string;
  Telefone3?: string;
  Banco: string;
  Valor_Beneficio: string;
  UF: string;
  Municipio: string;
  Margem_Disponivel?: string;
  status?: string;
}

export function BaseOffModern() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<BaseOffLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<BaseOffLead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [nomeFilter, setNomeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Status options
  const statusOptions = [
    "Novo lead",
    "Em andamento", 
    "Aguardando retorno",
    "Cliente Fechado",
    "Oferta negada",
    "Contato Futuro"
  ];
  
  // Generate list states
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedBanco, setSelectedBanco] = useState<string>("");
  const [valorParcela, setValorParcela] = useState<string>("");
  const [selectedUF, setSelectedUF] = useState<string>("");
  const [quantidadeLeads, setQuantidadeLeads] = useState<string>("10");
  const [availableBancos, setAvailableBancos] = useState<string[]>([]);
  const [availableUFs, setAvailableUFs] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      initializeData();
    }
  }, [user]);

  const initializeData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([
        fetchLeads(),
        fetchAvailableBancos(),
        fetchAvailableUFs(),
        checkDailyLimit()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    filterLeads();
  }, [leads, nomeFilter, statusFilter]);

  const fetchLeads = async () => {
    try {
      console.log('BaseOff: Fetching leads using secure function...');
      const { data, error } = await supabase
        .rpc('secure_baseoff_access', {
          limite: 50
        });

      if (error) {
        console.error('BaseOff: Error fetching leads:', error);
        throw error;
      }
      
      console.log('BaseOff: Fetched leads:', data?.length || 0);
      
      // Mapear os dados para a interface esperada
      const mappedLeads = data?.map((item: any) => ({
        CPF: item.cpf,
        Nome: item.nome,
        Telefone1: item.telefone1,
        Telefone2: item.telefone2,
        Telefone3: item.telefone3,
        Banco: item.banco,
        Valor_Beneficio: item.valor_beneficio,
        UF: item.uf,
        Municipio: item.municipio,
        Margem_Disponivel: item.margem_disponivel,
        status: 'Novo lead'
      })) || [];
      
      setLeads(mappedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads. Verifique suas permissões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBancos = async () => {
    try {
      console.log('BaseOff: Fetching available bancos using secure function...');
      const { data, error } = await supabase
        .rpc('get_available_banks');

      if (error) {
        console.error('Error fetching available banks:', error);
        throw error;
      }
      
      console.log('BaseOff: Available bancos:', data);
      const bankCodes = data?.map((item: any) => item.codigo_banco) || [];
      setAvailableBancos(bankCodes);
    } catch (error) {
      console.error('Error fetching bancos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar bancos disponíveis",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableUFs = async () => {
    try {
      console.log('BaseOff: Fetching available UFs using secure function...');
      const { data, error } = await supabase
        .rpc('get_available_ufs');

      if (error) {
        console.error('Error fetching UFs:', error);
        throw error;
      }
      
      const ufs = data?.map((item: any) => item.uf) || [];
      setAvailableUFs(ufs);
    } catch (error) {
      console.error('Error fetching UFs:', error);
    }
  };

  const checkDailyLimit = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_baseoff_daily_limit', { user_id_param: user?.id });

      if (error) throw error;
      setDailyLimit(data || 0);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (nomeFilter.trim()) {
      filtered = filtered.filter(lead => 
        lead.Nome.toLowerCase().includes(nomeFilter.toLowerCase())
      );
    }

    if (statusFilter.trim()) {
      filtered = filtered.filter(lead => 
        lead.status === statusFilter
      );
    }

    setFilteredLeads(filtered);
  };
  
  const formatPhoneForWhatsApp = (phone: string) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const updateLeadStatus = async (leadIndex: number, newStatus: string) => {
    try {
      const updatedLeads = [...leads];
      updatedLeads[leadIndex] = { ...updatedLeads[leadIndex], status: newStatus };
      setLeads(updatedLeads);
      
      toast({
        title: "Status atualizado",
        description: `Lead marcado como: ${newStatus}`,
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

  const generateLeads = async () => {
    try {
      setIsGenerating(true);

      const requestedLeads = parseInt(quantidadeLeads);
      const maxLeads = Math.min(requestedLeads, dailyLimit);

      if (!selectedBanco) {
        toast({
          title: "Erro",
          description: "Selecione um código de banco",
          variant: "destructive",
        });
        return;
      }

      if (!quantidadeLeads || requestedLeads <= 0) {
        toast({
          title: "Erro",
          description: "Informe uma quantidade válida de leads",
          variant: "destructive",
        });
        return;
      }

      if (maxLeads <= 0) {
        toast({
          title: "Limite atingido",
          description: "Você atingiu o limite diário de leads",
          variant: "destructive",
        });
        return;
      }

      console.log('BaseOff: Generating leads using secure function...');
      const { data: availableLeads, error: fetchError } = await supabase
        .rpc('secure_baseoff_access', {
          limite: maxLeads,
          codigo_banco_filter: selectedBanco,
          uf_filter: selectedUF || null
        });

      if (fetchError) {
        console.error('BaseOff: Error fetching leads:', fetchError);
        throw fetchError;
      }

      if (!availableLeads || availableLeads.length === 0) {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads disponíveis com esses filtros",
          variant: "destructive",
        });
        return;
      }

      await supabase.rpc('update_daily_baseoff_usage', {
        user_id_param: user?.id,
        leads_count_param: availableLeads.length
      });

      await supabase
        .from('baseoff_requests')
        .insert({
          user_id: user?.id,
          leads_count: availableLeads.length,
          codigo_banco: selectedBanco
        });

      toast({
        title: "Sucesso",
        description: `${availableLeads.length} leads gerados com sucesso`,
      });

      setIsGenerateDialogOpen(false);
      fetchLeads();
      checkDailyLimit();
      
      setSelectedBanco("");
      setValorParcela("");
      setSelectedUF("");
      setQuantidadeLeads("10");
      
    } catch (error) {
      console.error('BaseOff: Error generating leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar leads",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <Database className="absolute inset-0 m-auto h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground">Carregando BaseOFF...</p>
            <p className="text-sm text-muted-foreground">Preparando seus leads premium</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: filteredLeads.length,
    available: dailyLimit,
    premium: filteredLeads.filter(l => l.Margem_Disponivel && parseFloat(l.Margem_Disponivel.replace(/[^\d.,]/g, '').replace(',', '.')) > 1000).length,
    contacted: filteredLeads.filter(l => l.status && l.status !== 'Novo lead').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-dark to-success p-8 text-white">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Database className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">BaseOFF Premium</h1>
                  <p className="text-lg opacity-90">Leads qualificados e verificados</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{dailyLimit}</div>
                <div className="text-sm opacity-80">Limite Restante</div>
              </div>
              <Button 
                onClick={() => {
                  if (!user || isLoadingData || availableBancos.length === 0) {
                    toast({
                      title: "Atenção",
                      description: availableBancos.length === 0 ? "Nenhum banco disponível" : "Carregando dados...",
                      variant: "destructive",
                    });
                    return;
                  }
                  setIsGenerateDialogOpen(true);
                }}
                disabled={isLoadingData || !user || availableBancos.length === 0}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Solicitar Leads
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/20 rounded-xl">
                  <Target className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Total de Leads</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-success/10 to-success/5 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="p-2 md:p-3 bg-success/20 rounded-xl">
                  <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-success" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Premium</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.premium}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-warning/10 to-warning/5 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="p-2 md:p-3 bg-warning/20 rounded-xl">
                  <Users className="h-4 w-4 md:h-6 md:w-6 text-warning" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Contatados</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.contacted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="p-2 md:p-3 bg-blue-500/20 rounded-xl">
                  <RefreshCw className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Disponível</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stats.available}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome-filter">Nome do Cliente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome-filter"
                    type="text"
                    placeholder="Digite o nome..."
                    value={nomeFilter}
                    onChange={(e) => setNomeFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status do Lead</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={fetchLeads} 
                  className="w-full bg-gradient-to-r from-primary to-primary-dark"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Leads BaseOFF ({filteredLeads.length})
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold min-w-[180px]">Cliente</TableHead>
                    <TableHead className="font-semibold min-w-[120px] hidden md:table-cell">CPF</TableHead>
                    <TableHead className="font-semibold min-w-[100px]">Contato</TableHead>
                    <TableHead className="font-semibold min-w-[130px] hidden lg:table-cell">Status</TableHead>
                    <TableHead className="font-semibold min-w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead, index) => (
                    <TableRow key={index} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-sm md:text-base">{lead.Nome}</p>
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-xs text-muted-foreground">
                            <span>{lead.Municipio} - {lead.UF}</span>
                            <span className="md:hidden font-mono text-xs bg-muted px-1 py-0.5 rounded max-w-fit">
                              {formatCPF(lead.CPF)}
                            </span>
                            {lead.Margem_Disponivel && (
                              <Badge variant="outline" className="text-xs max-w-fit">
                                {lead.Margem_Disponivel}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {formatCPF(lead.CPF)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {lead.Telefone1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(formatPhoneForWhatsApp(lead.Telefone1), '_blank')}
                              className="h-8 px-2"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          )}
                          {lead.Telefone1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`tel:${lead.Telefone1}`, '_self')}
                              className="h-8 px-2"
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Select 
                          value={lead.status || "Novo lead"} 
                          onValueChange={(value) => updateLeadStatus(index, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(status => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                          <div className="lg:hidden">
                            <Select 
                              value={lead.status || "Novo lead"} 
                              onValueChange={(value) => updateLeadStatus(index, value)}
                            >
                              <SelectTrigger className="w-8 h-8 p-0">
                                <div className="w-3 h-3 rounded-full bg-primary"></div>
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(status => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Generate Leads Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Solicitar Leads Premium
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Limite diário restante: <span className="font-semibold text-primary">{dailyLimit} leads</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="banco">Código do Banco *</Label>
                <Select value={selectedBanco} onValueChange={setSelectedBanco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingData ? (
                      <SelectItem value="" disabled>Carregando bancos...</SelectItem>
                    ) : availableBancos.length > 0 ? (
                      availableBancos.map(banco => (
                        <SelectItem key={banco} value={banco}>
                          Código: {banco}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>Nenhum banco disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor-parcela">Valor da Parcela</Label>
                <Input
                  id="valor-parcela"
                  type="text"
                  placeholder="Ex: 150.00 (opcional)"
                  value={valorParcela}
                  onChange={(e) => setValorParcela(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uf">Estado (UF)</Label>
                <Select value={selectedUF} onValueChange={setSelectedUF}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os estados</SelectItem>
                    {availableUFs.map(uf => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade de Leads *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  placeholder="10"
                  min="1"
                  max="80"
                  value={quantidadeLeads}
                  onChange={(e) => setQuantidadeLeads(e.target.value)}
                />
              </div>

              <Button 
                onClick={generateLeads} 
                className="w-full bg-gradient-to-r from-primary to-success hover:from-primary-dark hover:to-success" 
                disabled={isGenerating || !selectedBanco || !quantidadeLeads || isLoadingData || dailyLimit <= 0}
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Gerando Leads...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Gerar Leads Premium
                  </div>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}