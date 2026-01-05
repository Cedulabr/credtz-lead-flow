import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileText,
  Copy,
  Check,
  Building2,
  Banknote,
  ChevronRight,
  X,
  Upload,
  Calculator,
  Play,
  ChevronLeft,
  Loader2,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { BaseOffImport } from "./BaseOffImport";

interface BaseOffClient {
  id: string;
  nb: string;
  cpf: string;
  nome: string;
  data_nascimento: string | null;
  sexo: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  naturalidade: string | null;
  esp: string | null;
  dib: string | null;
  mr: number | null;
  banco_pagto: string | null;
  agencia_pagto: string | null;
  orgao_pagador: string | null;
  conta_corrente: string | null;
  meio_pagto: string | null;
  status_beneficio: string | null;
  bloqueio: string | null;
  pensao_alimenticia: string | null;
  representante: string | null;
  ddb: string | null;
  banco_rmc: string | null;
  valor_rmc: number | null;
  banco_rcc: string | null;
  valor_rcc: number | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  endereco: string | null;
  logr_tipo_1: string | null;
  logr_titulo_1: string | null;
  logr_nome_1: string | null;
  logr_numero_1: string | null;
  logr_complemento_1: string | null;
  bairro_1: string | null;
  cidade_1: string | null;
  uf_1: string | null;
  cep_1: string | null;
  tel_fixo_1: string | null;
  tel_fixo_2: string | null;
  tel_fixo_3: string | null;
  tel_cel_1: string | null;
  tel_cel_2: string | null;
  tel_cel_3: string | null;
  email_1: string | null;
  email_2: string | null;
  email_3: string | null;
}

interface BaseOffContract {
  id: string;
  client_id?: string; // preferencial para vínculo
  cpf?: string; // redundância
  banco_emprestimo: string;
  contrato: string;
  vl_emprestimo: number | null;
  inicio_desconto: string | null;
  prazo: number | null;
  vl_parcela: number | null;
  tipo_emprestimo: string | null;
  data_averbacao: string | null;
  situacao_emprestimo: string | null;
  competencia: string | null;
  competencia_final: string | null;
  taxa: number | null;
  saldo: number | null;
}

interface SimulationResult {
  contrato: string;
  banco: string;
  tipo: string;
  vl_emprestimo: number;
  inicio_desconto: string | null;
  prazo: number | null;
  parcela: number;
  saldo: number;
  valorSimulado185: number;
  valorSimulado22: number;
  troco185: number;
  troco22: number;
}

interface ActiveClient {
  id: string;
  client_id: string;
  cpf: string;
  status: string;
  notes: string | null;
  client: BaseOffClient;
  contracts: BaseOffContract[];
}

const STATUS_OPTIONS = [
  "Contato iniciado",
  "Sem WhatsApp",
  "Sem contrato disponível",
  "Agendado",
  "Desinteresse momentâneo"
];

// Estados brasileiros
const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", 
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", 
  "SP", "SE", "TO"
];

export function BaseOffConsulta() {
  const { isAdmin, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"cpf" | "nome" | "nb">("cpf");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<BaseOffClient | null>(null);
  const [contracts, setContracts] = useState<BaseOffContract[]>([]);
  const [searchResults, setSearchResults] = useState<BaseOffClient[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  
  // Simulação
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  
  // Ativo
  const [showAtivo, setShowAtivo] = useState(false);
  const [activeClients, setActiveClients] = useState<ActiveClient[]>([]);
  const [currentActiveIndex, setCurrentActiveIndex] = useState(0);
  const [isLoadingAtivo, setIsLoadingAtivo] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  // Filtro Regional - Modal Ativo
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedUF, setSelectedUF] = useState("");
  const [selectedCidade, setSelectedCidade] = useState("");
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  const [isLoadingCidades, setIsLoadingCidades] = useState(false);

  // Buscar cidades quando UF é selecionado
  useEffect(() => {
    const fetchCidades = async () => {
      if (!selectedUF) {
        setCidadesDisponiveis([]);
        setSelectedCidade("");
        return;
      }

      setIsLoadingCidades(true);
      try {
        const { data, error } = await supabase
          .from("baseoff_clients")
          .select("municipio")
          .eq("uf", selectedUF)
          .not("municipio", "is", null)
          .limit(500);

        if (error) throw error;

        // Extrair cidades únicas e ordenar
        const cidadesUnicas = [...new Set((data || []).map(d => d.municipio).filter(Boolean))]
          .sort() as string[];
        
        setCidadesDisponiveis(cidadesUnicas);
      } catch (error) {
        console.error("Erro ao buscar cidades:", error);
        toast.error("Erro ao carregar cidades");
      } finally {
        setIsLoadingCidades(false);
      }
    };

    fetchCidades();
  }, [selectedUF]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Digite um termo para buscar");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedClient(null);
    setContracts([]);

    try {
      let query = supabase.from("baseoff_clients").select("*");

      if (searchType === "cpf") {
        const cleanCpf = searchTerm.replace(/\D/g, "").padStart(11, "0");
        query = query.eq("cpf", cleanCpf);
      } else if (searchType === "nb") {
        query = query.ilike("nb", `%${searchTerm}%`);
      } else {
        query = query.ilike("nome", `%${searchTerm}%`);
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info("Nenhum cliente encontrado");
        return;
      }

      setSearchResults(data as BaseOffClient[]);

      if (data.length === 1) {
        await selectClient(data[0] as BaseOffClient);
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      toast.error("Erro ao buscar cliente");
    } finally {
      setIsSearching(false);
    }
  };

  const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "").padStart(11, "0").slice(0, 11);

  // Buscar contratos do cliente (prioriza vínculo por client_id; fallback por CPF)
  const fetchContractsForClient = async (client: Pick<BaseOffClient, "id" | "cpf">): Promise<BaseOffContract[]> => {
    // 1) client_id (mais confiável)
    try {
      const { data, error } = await supabase
        .from("baseoff_contracts")
        .select("*")
        .eq("client_id", client.id)
        .order("data_averbacao", { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) return data as BaseOffContract[];
    } catch (error) {
      console.error("Erro ao buscar contratos por client_id:", error);
    }

    // 2) fallback por CPF (caso existam contratos legados sem client_id consistente)
    try {
      const cpfDigits = normalizeCpf(client.cpf);
      const cpfSemZeros = cpfDigits.replace(/^0+/, "");
      const cpfMascara = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      const variants = Array.from(new Set([cpfDigits, cpfSemZeros, cpfMascara].filter(Boolean)));

      const { data, error } = await supabase
        .from("baseoff_contracts")
        .select("*")
        .in("cpf", variants)
        .order("data_averbacao", { ascending: false });

      if (error) throw error;
      return (data || []) as BaseOffContract[];
    } catch (error) {
      console.error("Erro ao buscar contratos por CPF:", error);
      return [];
    }
  };

  const selectClient = async (client: BaseOffClient) => {
    setSelectedClient(client);
    setSearchResults([]);
    setActiveTab("dados");
    setShowSimulation(false);

    const clientContracts = await fetchContractsForClient(client);
    setContracts(clientContracts);
  };

  // Calcular simulações - apenas para contratos de empréstimo
  const calculateSimulations = () => {
    const FATOR_185 = 0.0234;
    const FATOR_22 = 0.022605;

    // Filtrar apenas contratos de empréstimo (que tenham contrato e tipo_emprestimo)
    const results: SimulationResult[] = contracts
      .filter(c => c.contrato && c.tipo_emprestimo && c.vl_parcela && c.vl_parcela > 0)
      .map(contract => {
        const parcela = contract.vl_parcela || 0;
        const saldo = contract.saldo || 0;
        
        const valorSimulado185 = parcela / FATOR_185;
        const valorSimulado22 = parcela / FATOR_22;
        
        const troco185 = valorSimulado185 - saldo;
        const troco22 = valorSimulado22 - saldo;

        return {
          contrato: contract.contrato,
          banco: contract.banco_emprestimo,
          tipo: contract.tipo_emprestimo || "",
          vl_emprestimo: contract.vl_emprestimo || 0,
          inicio_desconto: contract.inicio_desconto,
          prazo: contract.prazo,
          parcela,
          saldo,
          valorSimulado185,
          valorSimulado22,
          troco185,
          troco22
        };
      });

    setSimulations(results);
    setShowSimulation(true);
    setActiveTab("simulados");
  };

  // Abrir modal de filtro regional antes de puxar clientes
  const handleAtivoClick = () => {
    setSelectedUF("");
    setSelectedCidade("");
    setShowFilterModal(true);
  };

  // Confirmar e puxar clientes com filtro
  const handleConfirmAtivo = async () => {
    if (!selectedUF) {
      toast.error("Selecione um estado");
      return;
    }
    
    if (!selectedCidade) {
      toast.error("Selecione uma cidade");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    setShowFilterModal(false);
    setIsLoadingAtivo(true);

    try {
      // Buscar IDs de clientes já atribuídos a qualquer usuário
      const { data: assignedClients } = await supabase
        .from("baseoff_active_clients")
        .select("client_id");

      const assignedIds = (assignedClients || []).map(c => c.client_id);

      // Buscar 50 clientes não atribuídos da região selecionada
      let query = supabase
        .from("baseoff_clients")
        .select("*")
        .eq("uf", selectedUF)
        .eq("municipio", selectedCidade)
        .limit(50);

      if (assignedIds.length > 0) {
        query = query.not("id", "in", `(${assignedIds.join(",")})`);
      }

      const { data: availableClients, error } = await query;

      if (error) throw error;

      if (!availableClients || availableClients.length === 0) {
        toast.info(`Não há clientes disponíveis em ${selectedCidade}/${selectedUF}`);
        setIsLoadingAtivo(false);
        return;
      }

      // Inserir clientes como atribuídos ao usuário
      const insertData = availableClients.map(client => ({
        client_id: client.id,
        cpf: client.cpf,
        user_id: user.id,
        status: "Pendente"
      }));

      const { error: insertError } = await supabase
        .from("baseoff_active_clients")
        .insert(insertData);

      if (insertError) throw insertError;

      // Buscar contratos para cada cliente (prioriza vínculo por client_id)
      const clientsWithContracts: ActiveClient[] = [];

      for (const client of availableClients) {
        const contractsData = await fetchContractsForClient(client as BaseOffClient);

        clientsWithContracts.push({
          id: "",
          client_id: client.id,
          cpf: client.cpf,
          status: "Pendente",
          notes: null,
          client: client as BaseOffClient,
          contracts: contractsData,
        });
      }

      setActiveClients(clientsWithContracts);
      setCurrentActiveIndex(0);
      setShowAtivo(true);
      
      toast.success(`${availableClients.length} clientes de ${selectedCidade}/${selectedUF} carregados`);
    } catch (error) {
      console.error("Erro ao carregar clientes ativos:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setIsLoadingAtivo(false);
    }
  };

  // Avançar para próximo cliente (requer status)
  const handleNextClient = () => {
    const currentClient = activeClients[currentActiveIndex];
    if (currentClient.status === "Pendente") {
      setStatusModal(true);
      return;
    }

    if (currentActiveIndex < activeClients.length - 1) {
      setCurrentActiveIndex(prev => prev + 1);
    } else {
      toast.info("Você atendeu todos os clientes da lista!");
      setShowAtivo(false);
    }
  };

  // Salvar status do cliente ativo
  const saveClientStatus = async () => {
    if (!selectedStatus) {
      toast.error("Selecione um status");
      return;
    }

    setIsSavingStatus(true);

    try {
      const currentClient = activeClients[currentActiveIndex];

      await supabase
        .from("baseoff_active_clients")
        .update({
          status: selectedStatus,
          notes: statusNotes || null,
          status_updated_at: new Date().toISOString()
        })
        .eq("client_id", currentClient.client_id)
        .eq("user_id", user?.id);

      // Atualizar estado local
      const updatedClients = [...activeClients];
      updatedClients[currentActiveIndex] = {
        ...currentClient,
        status: selectedStatus,
        notes: statusNotes
      };
      setActiveClients(updatedClients);

      toast.success("Status atualizado");
      setStatusModal(false);
      setSelectedStatus("");
      setStatusNotes("");

      // Avançar para próximo
      if (currentActiveIndex < activeClients.length - 1) {
        setCurrentActiveIndex(prev => prev + 1);
      } else {
        toast.info("Você atendeu todos os clientes da lista!");
        setShowAtivo(false);
      }
    } catch (error) {
      console.error("Erro ao salvar status:", error);
      toast.error("Erro ao salvar status");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success("Copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const formatCpf = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return date;
    }
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "secondary";
    const lower = status.toLowerCase();
    if (lower.includes("ativo") || lower.includes("normal")) return "default";
    if (lower.includes("quitado") || lower.includes("encerrado")) return "secondary";
    if (lower.includes("bloqueado") || lower.includes("suspenso")) return "destructive";
    return "outline";
  };

  const getPhones = (client?: BaseOffClient) => {
    const c = client || selectedClient;
    if (!c) return [];
    return [
      c.tel_cel_1,
      c.tel_cel_2,
      c.tel_cel_3,
      c.tel_fixo_1,
      c.tel_fixo_2,
      c.tel_fixo_3,
    ].filter(Boolean);
  };

  const getEmails = (client?: BaseOffClient) => {
    const c = client || selectedClient;
    if (!c) return [];
    return [c.email_1, c.email_2, c.email_3].filter(Boolean);
  };

  // Verificar se tem contratos de empréstimo para simulação
  const hasLoanContracts = (contractsList: BaseOffContract[]) => {
    return contractsList.some(c => c.contrato && c.tipo_emprestimo && c.vl_parcela && c.vl_parcela > 0);
  };

  // Componente para exibir bloco de contratos completo
  const ContractsBlock = ({ client, contractsList }: { client: BaseOffClient; contractsList: BaseOffContract[] }) => {
    const hasRmcRcc = client.banco_rmc || client.valor_rmc || client.banco_rcc || client.valor_rcc;
    const hasContracts = contractsList.length > 0;

    if (!hasRmcRcc && !hasContracts) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground text-sm">Nenhum contrato encontrado para este cliente</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {/* RMC e RCC do cliente */}
        {hasRmcRcc && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Cartões (RMC/RCC)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Banco RMC</p>
                <p className="font-medium">{client.banco_rmc || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor RMC</p>
                <p className="font-medium">{formatCurrency(client.valor_rmc)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Banco RCC</p>
                <p className="font-medium">{client.banco_rcc || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor RCC</p>
                <p className="font-medium">{formatCurrency(client.valor_rcc)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contratos de Empréstimo */}
        {hasContracts && (
          <div>
            <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Contratos de Empréstimo ({contractsList.length})
            </h4>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="text-right">Valor Empréstimo</TableHead>
                    <TableHead>Início Desconto</TableHead>
                    <TableHead className="text-center">Prazo</TableHead>
                    <TableHead className="text-right">Parcela</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Averbação</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Comp. Final</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsList.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.banco_emprestimo}</TableCell>
                      <TableCell className="font-mono text-xs">{contract.contrato}</TableCell>
                      <TableCell className="text-right">{formatCurrency(contract.vl_emprestimo)}</TableCell>
                      <TableCell>{formatDate(contract.inicio_desconto)}</TableCell>
                      <TableCell className="text-center">{contract.prazo || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(contract.vl_parcela)}</TableCell>
                      <TableCell>{contract.tipo_emprestimo || "-"}</TableCell>
                      <TableCell>{formatDate(contract.data_averbacao)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(contract.situacao_emprestimo) as any}>
                          {contract.situacao_emprestimo || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(contract.competencia)}</TableCell>
                      <TableCell>{formatDate(contract.competencia_final)}</TableCell>
                      <TableCell className="text-right">{contract.taxa ? `${contract.taxa}%` : "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(contract.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };

  if (showImport && isAdmin) {
    return <BaseOffImport onBack={() => setShowImport(false)} />;
  }

  // Tela de Ativo
  if (showAtivo && activeClients.length > 0) {
    const currentClient = activeClients[currentActiveIndex];
    const clientData = currentClient.client;
    const clientContracts = currentClient.contracts;

    return (
      <div className="p-4 space-y-4">
        {/* Header Ativo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setShowAtivo(false)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Atendimento Ativo
              </h1>
              <p className="text-sm text-muted-foreground">
                Cliente {currentActiveIndex + 1} de {activeClients.length}
              </p>
            </div>
          </div>
          <Badge variant={currentClient.status === "Pendente" ? "destructive" : "default"}>
            {currentClient.status}
          </Badge>
        </div>

        {/* Progress */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${((currentActiveIndex + 1) / activeClients.length) * 100}%` }}
          />
        </div>

        {/* Client Card */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{clientData.nome}</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>CPF: <span className="font-mono font-medium text-foreground">{formatCpf(clientData.cpf)}</span></span>
                <span>NB: <span className="font-mono font-medium text-foreground">{clientData.nb}</span></span>
                {clientData.municipio && (
                  <span>
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {clientData.municipio}/{clientData.uf}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {getPhones(clientData).slice(0, 3).map((phone, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono">
                    <Phone className="h-3 w-3 mr-1" />
                    {formatPhone(phone)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="contratos">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="contratos"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Contratos
                </TabsTrigger>
                <TabsTrigger
                  value="simulados"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  disabled={!hasLoanContracts(clientContracts)}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Simulados
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contratos">
                <ContractsBlock client={clientData} contractsList={clientContracts} />
              </TabsContent>

              <TabsContent value="simulados" className="p-4">
                <SimulationBlock contracts={clientContracts} formatCurrency={formatCurrency} formatDate={formatDate} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline"
            onClick={() => setStatusModal(true)}
          >
            Marcar Status
          </Button>
          <Button onClick={handleNextClient}>
            Próximo Cliente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Modal de Status */}
        <Dialog open={statusModal} onOpenChange={setStatusModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Selecione o Status do Atendimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Observações (opcional)"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusModal(false)}>
                Cancelar
              </Button>
              <Button onClick={saveClientStatus} disabled={isSavingStatus || !selectedStatus}>
                {isSavingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar e Avançar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Consulta Base OFF
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulte dados cadastrais e contratos de clientes
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setShowImport(true)} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar Base
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex gap-2">
              {(["cpf", "nome", "nb"] as const).map((type) => (
                <Button
                  key={type}
                  variant={searchType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchType(type)}
                >
                  {type === "cpf" ? "CPF" : type === "nome" ? "Nome" : "NB"}
                </Button>
              ))}
            </div>
            <div className="flex-1 flex gap-2">
              <Input
                placeholder={
                  searchType === "cpf"
                    ? "Digite o CPF..."
                    : searchType === "nome"
                    ? "Digite o nome..."
                    : "Digite o NB..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
              <Button 
                onClick={handleAtivoClick} 
                variant="secondary"
                disabled={isLoadingAtivo}
              >
                {isLoadingAtivo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Ativo
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 1 && (
            <div className="mt-4 border rounded-lg">
              <div className="p-2 bg-muted/50 border-b">
                <span className="text-sm font-medium">
                  {searchResults.length} resultados encontrados
                </span>
              </div>
              <ScrollArea className="h-48">
                {searchResults.map((client) => (
                  <div
                    key={client.id}
                    className="p-3 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => selectClient(client)}
                  >
                    <div>
                      <p className="font-medium">{client.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        CPF: {formatCpf(client.cpf)} | NB: {client.nb}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Filtro Regional */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Selecione a Região
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Select value={selectedUF} onValueChange={setSelectedUF}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado..." />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cidade (Município)</Label>
              <Select 
                value={selectedCidade} 
                onValueChange={setSelectedCidade}
                disabled={!selectedUF || isLoadingCidades}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingCidades 
                      ? "Carregando cidades..." 
                      : !selectedUF 
                        ? "Selecione um estado primeiro" 
                        : "Selecione a cidade..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-60">
                    {cidadesDisponiveis.map((cidade) => (
                      <SelectItem key={cidade} value={cidade}>
                        {cidade}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
              {selectedUF && cidadesDisponiveis.length === 0 && !isLoadingCidades && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma cidade encontrada para este estado
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilterModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAtivo} disabled={!selectedUF || !selectedCidade}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Details */}
      {selectedClient && (
        <Card>
          {/* Client Header */}
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">{selectedClient.nome}</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>CPF:</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCpf(selectedClient.cpf)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(selectedClient.cpf, "cpf")}
                    >
                      {copiedField === "cpf" ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>NB:</span>
                    <span className="font-mono font-medium text-foreground">
                      {selectedClient.nb}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(selectedClient.nb, "nb")}
                    >
                      {copiedField === "nb" ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getPhones().slice(0, 2).map((phone, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono">
                      <Phone className="h-3 w-3 mr-1" />
                      {formatPhone(phone)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1"
                        onClick={() => copyToClipboard(phone!, `phone-${idx}`)}
                      >
                        {copiedField === `phone-${idx}` ? (
                          <Check className="h-2.5 w-2.5 text-green-500" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedClient(null);
                  setContracts([]);
                  setShowSimulation(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="dados"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <User className="h-4 w-4 mr-2" />
                  Dados Cadastrais
                </TabsTrigger>
                <TabsTrigger
                  value="info"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Informações
                </TabsTrigger>
                <TabsTrigger
                  value="contratos"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Contratos ({contracts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="simulados"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                  disabled={!hasLoanContracts(contracts)}
                  onClick={() => {
                    if (!showSimulation && hasLoanContracts(contracts)) {
                      calculateSimulations();
                    }
                  }}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Simulados
                </TabsTrigger>
              </TabsList>

              {/* Dados Cadastrais */}
              <TabsContent value="dados" className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoBlock label="Nome Completo" value={selectedClient.nome} />
                  <InfoBlock label="CPF" value={formatCpf(selectedClient.cpf)} />
                  <InfoBlock
                    label="Data de Nascimento"
                    value={formatDate(selectedClient.data_nascimento)}
                  />
                  <InfoBlock label="Sexo" value={selectedClient.sexo} />
                  <InfoBlock label="Naturalidade" value={selectedClient.naturalidade} />
                  <InfoBlock label="Nome da Mãe" value={selectedClient.nome_mae} />
                  <InfoBlock label="Nome do Pai" value={selectedClient.nome_pai} />
                  <InfoBlock label="Representante" value={selectedClient.representante} />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary" />
                    Dados do Benefício
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoBlock label="NB (Número do Benefício)" value={selectedClient.nb} />
                    <InfoBlock label="Espécie" value={selectedClient.esp} />
                    <InfoBlock label="DIB" value={formatDate(selectedClient.dib)} />
                    <InfoBlock label="DDB" value={formatDate(selectedClient.ddb)} />
                    <InfoBlock label="Margem" value={formatCurrency(selectedClient.mr)} />
                    <InfoBlock label="Status" value={selectedClient.status_beneficio} />
                    <InfoBlock label="Bloqueio" value={selectedClient.bloqueio} />
                    <InfoBlock label="Pensão Alimentícia" value={selectedClient.pensao_alimenticia} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Dados Bancários
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoBlock label="Banco Pagamento" value={selectedClient.banco_pagto} />
                    <InfoBlock label="Agência" value={selectedClient.agencia_pagto} />
                    <InfoBlock label="Conta Corrente" value={selectedClient.conta_corrente} />
                    <InfoBlock label="Órgão Pagador" value={selectedClient.orgao_pagador} />
                    <InfoBlock label="Meio de Pagamento" value={selectedClient.meio_pagto} />
                    <InfoBlock label="Banco RMC" value={selectedClient.banco_rmc} />
                    <InfoBlock label="Valor RMC" value={formatCurrency(selectedClient.valor_rmc)} />
                    <InfoBlock label="Banco RCC" value={selectedClient.banco_rcc} />
                    <InfoBlock label="Valor RCC" value={formatCurrency(selectedClient.valor_rcc)} />
                  </div>
                </div>
              </TabsContent>

              {/* Informações */}
              <TabsContent value="info" className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Endereço do Benefício
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoBlock label="Endereço" value={selectedClient.endereco} />
                    <InfoBlock label="Bairro" value={selectedClient.bairro} />
                    <InfoBlock label="Município" value={selectedClient.municipio} />
                    <InfoBlock label="UF" value={selectedClient.uf} />
                    <InfoBlock label="CEP" value={selectedClient.cep} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Endereço Residencial
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoBlock
                      label="Logradouro"
                      value={
                        [
                          selectedClient.logr_tipo_1,
                          selectedClient.logr_titulo_1,
                          selectedClient.logr_nome_1,
                          selectedClient.logr_numero_1,
                        ]
                          .filter(Boolean)
                          .join(" ") || null
                      }
                    />
                    <InfoBlock label="Complemento" value={selectedClient.logr_complemento_1} />
                    <InfoBlock label="Bairro" value={selectedClient.bairro_1} />
                    <InfoBlock label="Cidade" value={selectedClient.cidade_1} />
                    <InfoBlock label="UF" value={selectedClient.uf_1} />
                    <InfoBlock label="CEP" value={selectedClient.cep_1} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Telefones
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getPhones().length > 0 ? (
                      getPhones().map((phone, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="font-mono text-sm py-2 px-3"
                        >
                          <Phone className="h-3.5 w-3.5 mr-2" />
                          {formatPhone(phone)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-2"
                            onClick={() => copyToClipboard(phone!, `phone-info-${idx}`)}
                          >
                            {copiedField === `phone-info-${idx}` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Nenhum telefone cadastrado
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    E-mails
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getEmails().length > 0 ? (
                      getEmails().map((email, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="font-mono text-sm py-2 px-3"
                        >
                          <Mail className="h-3.5 w-3.5 mr-2" />
                          {email}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-2"
                            onClick={() => copyToClipboard(email!, `email-${idx}`)}
                          >
                            {copiedField === `email-${idx}` ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Nenhum e-mail cadastrado
                      </span>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Contratos */}
              <TabsContent value="contratos" className="p-0">
                <ContractsBlock client={selectedClient} contractsList={contracts} />
              </TabsContent>

              {/* Simulados */}
              <TabsContent value="simulados" className="p-4">
                {simulations.length > 0 ? (
                  <SimulationBlock 
                    contracts={contracts.filter(c => c.contrato && c.tipo_emprestimo && c.vl_parcela && c.vl_parcela > 0)} 
                    formatCurrency={formatCurrency} 
                    formatDate={formatDate}
                    simulations={simulations}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calculator className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground mb-4">
                      {!hasLoanContracts(contracts) 
                        ? "Nenhum contrato de empréstimo disponível para simulação"
                        : "Clique para calcular simulações"
                      }
                    </p>
                    {hasLoanContracts(contracts) && (
                      <Button onClick={calculateSimulations}>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calcular Simulações
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedClient && searchResults.length === 0 && !isSearching && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Busque um cliente</h3>
            <p className="text-muted-foreground max-w-md">
              Digite o CPF, nome ou número do benefício para consultar os dados cadastrais e
              contratos do cliente. Ou clique em <strong>Ativo</strong> para iniciar atendimento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente auxiliar para exibir informações
function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

// Componente de Simulação
function SimulationBlock({ 
  contracts, 
  formatCurrency, 
  formatDate,
  simulations: existingSimulations
}: { 
  contracts: BaseOffContract[]; 
  formatCurrency: (value: number | null) => string;
  formatDate: (date: string | null) => string;
  simulations?: SimulationResult[];
}) {
  const FATOR_185 = 0.0234;
  const FATOR_22 = 0.022605;

  const simulations = existingSimulations || contracts
    .filter(c => c.contrato && c.tipo_emprestimo && c.vl_parcela && c.vl_parcela > 0)
    .map(contract => {
      const parcela = contract.vl_parcela || 0;
      const saldo = contract.saldo || 0;
      
      const valorSimulado185 = parcela / FATOR_185;
      const valorSimulado22 = parcela / FATOR_22;
      
      const troco185 = valorSimulado185 - saldo;
      const troco22 = valorSimulado22 - saldo;

      return {
        contrato: contract.contrato,
        banco: contract.banco_emprestimo,
        tipo: contract.tipo_emprestimo || "",
        vl_emprestimo: contract.vl_emprestimo || 0,
        inicio_desconto: contract.inicio_desconto,
        prazo: contract.prazo,
        parcela,
        saldo,
        valorSimulado185,
        valorSimulado22,
        troco185,
        troco22
      };
    });

  if (simulations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calculator className="h-10 w-10 text-muted-foreground/30 mb-2" />
        <p className="text-muted-foreground text-sm">
          Nenhum contrato de empréstimo elegível para simulação
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Simulação de Portabilidade
        </h4>
        <p className="text-sm text-muted-foreground">
          Valores estimados com base nos fatores de taxa 1,85% (0,0234) e taxa alternativa (0,022605)
        </p>
      </div>
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead className="text-right">Valor Empréstimo</TableHead>
              <TableHead>Início Desconto</TableHead>
              <TableHead className="text-center">Prazo</TableHead>
              <TableHead className="text-right">Parcela</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo Devedor</TableHead>
              <TableHead className="text-right">Valor (1,85%)</TableHead>
              <TableHead className="text-right">Troco (1,85%)</TableHead>
              <TableHead className="text-right">Valor (Alt.)</TableHead>
              <TableHead className="text-right">Troco (Alt.)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {simulations.map((sim, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-xs">{sim.contrato}</TableCell>
                <TableCell className="text-right">{formatCurrency(sim.vl_emprestimo)}</TableCell>
                <TableCell>{formatDate(sim.inicio_desconto)}</TableCell>
                <TableCell className="text-center">{sim.prazo || "-"}</TableCell>
                <TableCell className="text-right">{formatCurrency(sim.parcela)}</TableCell>
                <TableCell>{sim.tipo}</TableCell>
                <TableCell className="text-right">{formatCurrency(sim.saldo)}</TableCell>
                <TableCell className="text-right font-medium text-primary">
                  {formatCurrency(sim.valorSimulado185)}
                </TableCell>
                <TableCell className={`text-right font-medium ${sim.troco185 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(sim.troco185)}
                </TableCell>
                <TableCell className="text-right font-medium text-primary">
                  {formatCurrency(sim.valorSimulado22)}
                </TableCell>
                <TableCell className={`text-right font-medium ${sim.troco22 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(sim.troco22)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ Os valores acima são apenas simulações informativas e não representam proposta formal.
        </p>
      </div>
    </div>
  );
}

interface BaseOffContract {
  id: string;
  banco_emprestimo: string;
  contrato: string;
  vl_emprestimo: number | null;
  inicio_desconto: string | null;
  prazo: number | null;
  vl_parcela: number | null;
  tipo_emprestimo: string | null;
  data_averbacao: string | null;
  situacao_emprestimo: string | null;
  competencia: string | null;
  competencia_final: string | null;
  taxa: number | null;
  saldo: number | null;
}
