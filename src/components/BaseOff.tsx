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
import { useToast } from "@/hooks/use-toast";
import { Plus, Filter, LogIn } from "lucide-react";

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

export function BaseOff() {
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
    console.log('BaseOff: Component mounted, user:', user);
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
      console.log('BaseOff: Fetching leads...');
      const { data, error } = await supabase
        .from('baseoff')
        .select('*')
        .not('Banco', 'is', null)
        .not('Nome', 'is', null)
        .limit(50);

      if (error) {
        console.error('BaseOff: Error fetching leads:', error);
        throw error;
      }
      
      console.log('BaseOff: Fetched leads:', data?.length || 0);
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBancos = async () => {
    try {
      console.log('BaseOff: Fetching available bancos...');
      
      // First get allowed banks from admin settings
      const { data: allowedBanks, error: allowedError } = await supabase
        .from('baseoff_allowed_banks')
        .select('codigo_banco')
        .eq('is_active', true);

      if (allowedError) {
        console.error('Error fetching allowed banks:', allowedError);
        throw allowedError;
      }
      
      console.log('BaseOff: Allowed banks:', allowedBanks);
      const allowedCodes = allowedBanks?.map(bank => bank.codigo_banco) || [];
      
      if (allowedCodes.length === 0) {
        console.log('BaseOff: No allowed banks found');
        setAvailableBancos([]);
        return;
      }

      // Then get available leads with those bank codes
      const { data, error } = await supabase
        .from('baseoff')
        .select('Banco')
        .not('Banco', 'is', null)
        .in('Banco', allowedCodes);

      if (error) {
        console.error('Error fetching available leads:', error);
        throw error;
      }
      
      const uniqueBancos = [...new Set(data?.map((item: any) => item.Banco).filter(Boolean))] as string[];
      console.log('BaseOff: Available bancos:', uniqueBancos);
      setAvailableBancos(uniqueBancos);
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
      const { data, error } = await supabase
        .from('baseoff')
        .select('UF')
        .not('UF', 'is', null);

      if (error) throw error;
      
      const uniqueUFs = [...new Set(data?.map((item: any) => item.UF).filter(Boolean))] as string[];
      setAvailableUFs(uniqueUFs);
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

    if (statusFilter.trim() && statusFilter !== "all") {
      filtered = filtered.filter(lead => 
        lead.status === statusFilter
      );
    }

    setFilteredLeads(filtered);
  };
  
  const formatPhoneForWhatsApp = (phone: string) => {
    if (!phone) return '';
    // Remove all non-digits
    const cleanPhone = phone.replace(/\D/g, '');
    // Add country code if not present
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
      console.log('BaseOff: Generating leads with filters:', {
        selectedBanco,
        valorParcela,
        selectedUF,
        quantidadeLeads
      });

      const requestedLeads = parseInt(quantidadeLeads);
      const maxLeads = Math.min(requestedLeads, dailyLimit);

      // Validação dos campos obrigatórios
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

      // Construir query com filtros
      let query = supabase
        .from('baseoff')
        .select('*')
        .eq('Banco', selectedBanco)
        .not('Nome', 'is', null)
        .not('CPF', 'is', null);

      // Filtro por valor da parcela (se preenchido)
      if (valorParcela) {
        query = query.eq('Valor_Beneficio', valorParcela);
      }

      // Filtro por UF (se selecionado)
      if (selectedUF && selectedUF !== "all") {
        query = query.eq('UF', selectedUF);
      }

      const { data: availableLeads, error: fetchError } = await query.limit(maxLeads);

      if (fetchError) {
        console.error('BaseOff: Error fetching leads:', fetchError);
        throw fetchError;
      }

      console.log('BaseOff: Found leads:', availableLeads?.length || 0);

      if (!availableLeads || availableLeads.length === 0) {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads disponíveis com esses filtros",
          variant: "destructive",
        });
        return;
      }

      // Atualizar tracking de uso diário
      await supabase.rpc('update_daily_baseoff_usage', {
        user_id_param: user?.id,
        leads_count_param: availableLeads.length
      });

      // Registrar a solicitação
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
      
      // Limpar filtros
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Carregando dados do BaseOff...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Você precisa estar logado para acessar o BaseOff. 
            Faça login para continuar.
          </p>
          <Button onClick={() => window.location.href = '/auth'} className="mt-4">
            <LogIn className="mr-2 h-4 w-4" />
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">BaseOFF</h1>
        <div className="flex gap-4">
          <div className="text-sm text-muted-foreground">
            Limite diário restante: <strong>{dailyLimit}</strong>
          </div>
          <Button 
            onClick={() => {
              console.log('BaseOff: Gerar Lista clicked');
              console.log('BaseOff: Available bancos:', availableBancos);
              console.log('BaseOff: Available UFs:', availableUFs);
              console.log('BaseOff: User:', user);
              console.log('BaseOff: Loading data:', isLoadingData);
              
              if (!user) {
                toast({
                  title: "Erro",
                  description: "Usuário não autenticado",
                  variant: "destructive",
                });
                return;
              }
              
              if (isLoadingData) {
                toast({
                  title: "Aguarde",
                  description: "Carregando dados necessários...",
                  variant: "default",
                });
                return;
              }
              
              if (availableBancos.length === 0) {
                toast({
                  title: "Atenção",
                  description: "Nenhum banco disponível para geração de leads",
                  variant: "destructive",
                });
                return;
              }
              
              setIsGenerateDialogOpen(true);
            }}
            disabled={isLoadingData || !user || availableBancos.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoadingData ? "Carregando..." : "Gerar Lista"}
          </Button>
        </div>
      </div>

      {/* Generate Leads Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Lista de Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="banco">Código do Banco *</Label>
              <Select value={selectedBanco} onValueChange={setSelectedBanco}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um código de banco" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingData ? (
                    <SelectItem value="loading" disabled>Carregando bancos...</SelectItem>
                  ) : availableBancos.length > 0 ? (
                    availableBancos.map(banco => (
                      <SelectItem key={banco} value={banco}>
                        Código: {banco}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Nenhum banco disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="valor-parcela">Valor da Parcela</Label>
              <Input
                id="valor-parcela"
                type="text"
                placeholder="Ex: 150.00 (opcional)"
                value={valorParcela}
                onChange={(e) => setValorParcela(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="uf">Estado (UF)</Label>
              <Select value={selectedUF} onValueChange={setSelectedUF}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estado (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {isLoadingData ? (
                    <SelectItem value="loading-states" disabled>Carregando estados...</SelectItem>
                  ) : availableUFs.length > 0 ? (
                    availableUFs.map(uf => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-states" disabled>Nenhum estado disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
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

            <p className="text-sm text-muted-foreground">
              Limite diário restante: <strong>{dailyLimit}</strong> leads
            </p>

            <Button 
              onClick={generateLeads} 
              className="w-full" 
              disabled={isGenerating || !selectedBanco || !quantidadeLeads || isLoadingData || dailyLimit <= 0}
            >
              {isGenerating ? "Gerando..." : isLoadingData ? "Carregando..." : "Gerar Leads"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome-filter">Nome do Cliente</Label>
              <Input
                id="nome-filter"
                type="text"
                placeholder="Digite o nome do cliente..."
                value={nomeFilter}
                onChange={(e) => setNomeFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Status do Lead</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads BaseOFF ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{lead.Nome}</TableCell>
                  <TableCell>{formatCPF(lead.CPF)}</TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      {lead.Telefone1 && (
                        <a 
                          href={formatPhoneForWhatsApp(lead.Telefone1)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          📱 {lead.Telefone1}
                        </a>
                      )}
                      {lead.Telefone2 && (
                        <a 
                          href={formatPhoneForWhatsApp(lead.Telefone2)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          📱 {lead.Telefone2}
                        </a>
                      )}
                      {lead.Telefone3 && (
                        <a 
                          href={formatPhoneForWhatsApp(lead.Telefone3)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          📱 {lead.Telefone3}
                        </a>
                      )}
                      {!lead.Telefone1 && !lead.Telefone2 && !lead.Telefone3 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs h-6"
                          onClick={() => {
                            // TODO: Implement phone number registration
                            toast({
                              title: "Em desenvolvimento",
                              description: "Funcionalidade de cadastro de número em desenvolvimento",
                            });
                          }}
                        >
                          Cadastrar número
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={lead.status || "Novo lead"} 
                      onValueChange={(value) => updateLeadStatus(index, value)}
                    >
                      <SelectTrigger className="w-[150px]">
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}