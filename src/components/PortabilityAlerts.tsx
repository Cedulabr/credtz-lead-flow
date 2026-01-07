import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  Phone,
  User,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign,
  Timer,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PortabilityProposal {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  banco: string;
  tipo_operacao: string;
  troco: number | null;
  parcela: number | null;
  saldo_devedor: number | null;
  status: string;
  status_updated_at: string | null;
  created_at: string;
  user_id: string;
  company_id: string | null;
  observacao: string | null;
}

interface Profile {
  id: string;
  name: string | null;
}

// Helper para calcular dias úteis
const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const curDate = new Date(startDate);
  
  while (curDate < endDate) {
    curDate.setDate(curDate.getDate() + 1);
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  
  return count;
};

export function PortabilityAlerts() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [proposals, setProposals] = useState<PortabilityProposal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [selectedProposal, setSelectedProposal] = useState<PortabilityProposal | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);

  useEffect(() => {
    checkRolesAndFetch();
  }, [user]);

  const checkRolesAndFetch = async () => {
    if (!user?.id) return;
    
    // Check gestor role
    const { data: gestorData } = await supabase
      .from("user_companies")
      .select("company_id, company_role")
      .eq("user_id", user.id)
      .eq("is_active", true);
    
    const companyIds = (gestorData || []).map((uc: any) => uc.company_id);
    setUserCompanyIds(companyIds);
    setIsGestor((gestorData || []).some((uc: any) => uc.company_role === "gestor"));
    
    await fetchProposals(companyIds);
    await fetchProfiles();
  };

  const fetchProposals = async (companyIds?: string[]) => {
    try {
      setLoading(true);
      
      // Build query for portability proposals with status "proposta_digitada"
      let query = supabase
        .from("televendas")
        .select("*")
        .eq("status", "proposta_digitada")
        .ilike("tipo_operacao", "%portabilidade%")
        .order("status_updated_at", { ascending: true });
      
      // Filter by company for gestor (not admin)
      if (!isAdmin && companyIds && companyIds.length > 0) {
        query = query.in("company_id", companyIds);
      } else if (!isAdmin && !isGestor) {
        // Regular user sees only their own
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProposals((data as PortabilityProposal[]) || []);
    } catch (error) {
      console.error("Erro ao buscar propostas de portabilidade:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar propostas de portabilidade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name");

      if (error) throw error;
      
      const profileMap: Record<string, Profile> = {};
      (data || []).forEach((p) => {
        profileMap[p.id] = p;
      });
      setProfiles(profileMap);
    } catch (error) {
      console.error("Erro ao buscar perfis:", error);
    }
  };

  const getBusinessDays = useCallback((proposal: PortabilityProposal): number => {
    const statusDate = new Date(proposal.status_updated_at || proposal.created_at);
    statusDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getBusinessDaysBetween(statusDate, today);
  }, []);

  const getUrgencyLevel = useCallback((businessDays: number): { level: string; color: string; bgColor: string } => {
    if (businessDays >= 5) {
      return { level: "URGENTE", color: "text-red-700", bgColor: "bg-red-100 border-red-300" };
    } else if (businessDays >= 3) {
      return { level: "Alto", color: "text-orange-700", bgColor: "bg-orange-100 border-orange-300" };
    } else if (businessDays >= 1) {
      return { level: "Médio", color: "text-amber-700", bgColor: "bg-amber-100 border-amber-300" };
    }
    return { level: "Baixo", color: "text-green-700", bgColor: "bg-green-100 border-green-300" };
  }, []);

  const uniqueBanks = useMemo(() => {
    return [...new Set(proposals.map((p) => p.banco))].sort();
  }, [proposals]);

  const uniqueUsers = useMemo(() => {
    const userIds = [...new Set(proposals.map((p) => p.user_id))];
    return userIds.map((id) => ({
      id,
      name: profiles[id]?.name || "Usuário",
    }));
  }, [proposals, profiles]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal) => {
      const matchesSearch =
        !searchQuery ||
        proposal.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.cpf?.includes(searchQuery) ||
        proposal.telefone?.includes(searchQuery);

      const matchesBank = bankFilter === "all" || proposal.banco === bankFilter;
      const matchesUser = userFilter === "all" || proposal.user_id === userFilter;
      
      const businessDays = getBusinessDays(proposal);
      const matchesUrgency = urgencyFilter === "all" || 
        (urgencyFilter === "urgent" && businessDays >= 5) ||
        (urgencyFilter === "high" && businessDays >= 3 && businessDays < 5) ||
        (urgencyFilter === "medium" && businessDays >= 1 && businessDays < 3) ||
        (urgencyFilter === "low" && businessDays < 1);

      return matchesSearch && matchesBank && matchesUser && matchesUrgency;
    });
  }, [proposals, searchQuery, bankFilter, userFilter, urgencyFilter, getBusinessDays]);

  const stats = useMemo(() => {
    return {
      total: proposals.length,
      urgent: proposals.filter((p) => getBusinessDays(p) >= 5).length,
      high: proposals.filter((p) => { const d = getBusinessDays(p); return d >= 3 && d < 5; }).length,
      medium: proposals.filter((p) => { const d = getBusinessDays(p); return d >= 1 && d < 3; }).length,
      low: proposals.filter((p) => getBusinessDays(p) < 1).length,
    };
  }, [proposals, getBusinessDays]);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "-";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return "-";
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const openDetail = (proposal: PortabilityProposal) => {
    setSelectedProposal(proposal);
    setIsDetailOpen(true);
  };

  const handleRefresh = () => {
    checkRolesAndFetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgentes (5+ dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/20">
                <Timer className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
                <p className="text-xs text-muted-foreground">Alto (3-4 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.medium}</p>
                <p className="text-xs text-muted-foreground">Médio (1-2 dias)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.low}</p>
                <p className="text-xs text-muted-foreground">Baixo (hoje)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bancos</SelectItem>
                {uniqueBanks.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(isAdmin || isGestor) && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {uniqueUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgent">Urgente (5+ dias)</SelectItem>
                <SelectItem value="high">Alto (3-4 dias)</SelectItem>
                <SelectItem value="medium">Médio (1-2 dias)</SelectItem>
                <SelectItem value="low">Baixo (hoje)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Propostas de Portabilidade Aguardando ({filteredProposals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProposals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma proposta de portabilidade aguardando.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgência</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Troco</TableHead>
                    <TableHead>Dias Úteis</TableHead>
                    {(isAdmin || isGestor) && <TableHead>Usuário</TableHead>}
                    <TableHead>Data Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((proposal) => {
                    const businessDays = getBusinessDays(proposal);
                    const urgency = getUrgencyLevel(businessDays);
                    
                    return (
                      <TableRow 
                        key={proposal.id} 
                        className={`cursor-pointer hover:bg-muted/50 ${businessDays >= 5 ? 'bg-red-50' : ''}`}
                        onClick={() => openDetail(proposal)}
                      >
                        <TableCell>
                          <Badge className={`${urgency.bgColor} ${urgency.color} border`}>
                            {urgency.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{proposal.nome}</div>
                          <div className="text-xs text-muted-foreground">{formatPhone(proposal.telefone)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{proposal.banco}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(proposal.troco)}
                        </TableCell>
                        <TableCell>
                          <div className={`font-bold ${businessDays >= 5 ? 'text-red-600' : businessDays >= 3 ? 'text-orange-600' : 'text-amber-600'}`}>
                            {businessDays} dia{businessDays !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        {(isAdmin || isGestor) && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {profiles[proposal.user_id]?.name || "Usuário"}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          {format(new Date(proposal.status_updated_at || proposal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Detalhes da Proposta
            </DialogTitle>
          </DialogHeader>
          {selectedProposal && (
            <div className="space-y-4">
              {(() => {
                const businessDays = getBusinessDays(selectedProposal);
                const urgency = getUrgencyLevel(businessDays);
                return (
                  <div className={`p-4 rounded-lg ${urgency.bgColor} border`}>
                    <div className="flex items-center gap-2">
                      {businessDays >= 5 ? (
                        <AlertTriangle className={`h-5 w-5 ${urgency.color}`} />
                      ) : (
                        <Clock className={`h-5 w-5 ${urgency.color}`} />
                      )}
                      <span className={`font-bold ${urgency.color}`}>
                        {businessDays >= 5 
                          ? "ATENÇÃO: Risco de retorno de saldo!" 
                          : `${businessDays} dia${businessDays !== 1 ? 's' : ''} útil desde proposta digitada`
                        }
                      </span>
                    </div>
                    <p className={`text-sm mt-2 ${urgency.color}`}>
                      {businessDays >= 5 
                        ? "Esta proposta está aguardando há 5 ou mais dias úteis. Entre em contato urgente com o cliente!"
                        : "Acompanhe o status da proposta no banco e mantenha o cliente informado."
                      }
                    </p>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedProposal.nome}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {formatPhone(selectedProposal.telefone)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-medium">{formatCPF(selectedProposal.cpf)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Banco</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {selectedProposal.banco}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Troco</p>
                  <p className="font-medium text-green-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(selectedProposal.troco)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Parcela</p>
                  <p className="font-medium">{formatCurrency(selectedProposal.parcela)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                  <p className="font-medium">{formatCurrency(selectedProposal.saldo_devedor)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data do Status</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedProposal.status_updated_at || selectedProposal.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {selectedProposal.observacao && (
                <div>
                  <p className="text-sm text-muted-foreground">Observação</p>
                  <p className="font-medium bg-muted/50 p-3 rounded-lg">{selectedProposal.observacao}</p>
                </div>
              )}

              {(isAdmin || isGestor) && (
                <div>
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium">{profiles[selectedProposal.user_id]?.name || "Usuário"}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    window.open(`https://wa.me/55${selectedProposal.telefone.replace(/\D/g, '')}`, '_blank');
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
