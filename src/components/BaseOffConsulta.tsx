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
import { Skeleton } from "./ui/skeleton";
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
  Calendar,
  Banknote,
  Wallet,
  ChevronRight,
  X,
  Upload,
  AlertCircle
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

export function BaseOffConsulta() {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"cpf" | "nome" | "nb">("cpf");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<BaseOffClient | null>(null);
  const [contracts, setContracts] = useState<BaseOffContract[]>([]);
  const [searchResults, setSearchResults] = useState<BaseOffClient[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");

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
        const cleanCpf = searchTerm.replace(/\D/g, "");
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

      // Se encontrou apenas um, seleciona automaticamente
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

  const selectClient = async (client: BaseOffClient) => {
    setSelectedClient(client);
    setSearchResults([]);
    setActiveTab("dados");

    // Buscar contratos do cliente
    try {
      const { data: contractsData, error } = await supabase
        .from("baseoff_contracts")
        .select("*")
        .eq("client_id", client.id)
        .order("data_averbacao", { ascending: false });

      if (error) throw error;
      setContracts((contractsData || []) as BaseOffContract[]);
    } catch (error) {
      console.error("Erro ao buscar contratos:", error);
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
    if (value === null) return "-";
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
    if (lower.includes("ativo") || lower.includes("normal")) return "success";
    if (lower.includes("quitado") || lower.includes("encerrado")) return "secondary";
    if (lower.includes("bloqueado") || lower.includes("suspenso")) return "destructive";
    return "outline";
  };

  const getPhones = () => {
    if (!selectedClient) return [];
    const phones = [
      selectedClient.tel_cel_1,
      selectedClient.tel_cel_2,
      selectedClient.tel_cel_3,
      selectedClient.tel_fixo_1,
      selectedClient.tel_fixo_2,
      selectedClient.tel_fixo_3,
    ].filter(Boolean);
    return phones;
  };

  const getEmails = () => {
    if (!selectedClient) return [];
    const emails = [
      selectedClient.email_1,
      selectedClient.email_2,
      selectedClient.email_3,
    ].filter(Boolean);
    return emails;
  };

  if (showImport && isAdmin) {
    return <BaseOffImport onBack={() => setShowImport(false)} />;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Consulta Base OFF
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulte dados cadastrais e contratos de clientes
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowImport(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar Base
          </Button>
        )}
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
                        <Check className="h-3 w-3 text-success" />
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
                        <Check className="h-3 w-3 text-success" />
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
                          <Check className="h-2.5 w-2.5 text-success" />
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
                    <InfoBlock
                      label="Pensão Alimentícia"
                      value={selectedClient.pensao_alimenticia}
                    />
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
                              <Check className="h-3 w-3 text-success" />
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
                              <Check className="h-3 w-3 text-success" />
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
                {contracts.length > 0 ? (
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Banco</TableHead>
                          <TableHead>Contrato</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Parcela</TableHead>
                          <TableHead>Prazo</TableHead>
                          <TableHead>Averbação</TableHead>
                          <TableHead className="text-right">Taxa</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead>Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">
                              {contract.banco_emprestimo}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {contract.contrato}
                            </TableCell>
                            <TableCell>{contract.tipo_emprestimo || "-"}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(contract.vl_emprestimo)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(contract.vl_parcela)}
                            </TableCell>
                            <TableCell>{contract.prazo || "-"}</TableCell>
                            <TableCell>{formatDate(contract.data_averbacao)}</TableCell>
                            <TableCell className="text-right">
                              {contract.taxa ? `${contract.taxa}%` : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(contract.saldo)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(contract.situacao_emprestimo) as any}>
                                {contract.situacao_emprestimo || "-"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">
                      Nenhum contrato encontrado para este cliente
                    </p>
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
              contratos do cliente.
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
