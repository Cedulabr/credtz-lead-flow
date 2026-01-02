import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  User,
  Phone,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { format, isToday, isPast, isFuture, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientReuseAlert {
  id: string;
  proposta_id: number;
  televendas_id: string | null;
  client_name: string;
  client_cpf: string | null;
  client_phone: string | null;
  bank_name: string;
  payment_date: string;
  reuse_months: number;
  alert_date: string;
  user_id: string;
  gestor_id: string | null;
  company_id: string | null;
  status: "pending" | "notified" | "converted" | "dismissed";
  notified_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  name: string | null;
}

export function ClientReuseAlerts() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [alerts, setAlerts] = useState<ClientReuseAlert[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<ClientReuseAlert | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [isGestor, setIsGestor] = useState(false);

  useEffect(() => {
    checkGestorRole();
    fetchAlerts();
    fetchProfiles();
  }, [user]);

  const checkGestorRole = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from("user_companies")
      .select("company_role")
      .eq("user_id", user.id)
      .eq("company_role", "gestor")
      .eq("is_active", true)
      .maybeSingle();
    
    setIsGestor(!!data);
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("client_reuse_alerts")
        .select("*")
        .order("alert_date", { ascending: true });

      if (error) throw error;
      setAlerts((data as ClientReuseAlert[]) || []);
    } catch (error) {
      console.error("Erro ao buscar alertas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar alertas.",
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

  const handleUpdateStatus = async (
    alertId: string,
    newStatus: "notified" | "converted" | "dismissed",
    notes?: string
  ) => {
    try {
      const updateData: any = {
        status: newStatus,
        notes: notes || null,
      };

      if (newStatus === "notified") {
        updateData.notified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("client_reuse_alerts")
        .update(updateData)
        .eq("id", alertId);

      if (error) throw error;

      const statusLabels = {
        notified: "Notificado",
        converted: "Convertido",
        dismissed: "Dispensado",
      };

      toast({
        title: "Status atualizado!",
        description: `Alerta marcado como ${statusLabels[newStatus]}.`,
      });

      setIsDetailOpen(false);
      setSelectedAlert(null);
      setActionNotes("");
      fetchAlerts();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do alerta.",
        variant: "destructive",
      });
    }
  };

  const uniqueBanks = useMemo(() => {
    return [...new Set(alerts.map((a) => a.bank_name))].sort();
  }, [alerts]);

  const uniqueUsers = useMemo(() => {
    const userIds = [...new Set(alerts.map((a) => a.user_id))];
    return userIds.map((id) => ({
      id,
      name: profiles[id]?.name || "Usuário",
    }));
  }, [alerts, profiles]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        !searchQuery ||
        alert.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.client_cpf?.includes(searchQuery) ||
        alert.client_phone?.includes(searchQuery);

      const matchesBank = bankFilter === "all" || alert.bank_name === bankFilter;
      const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
      const matchesUser = userFilter === "all" || alert.user_id === userFilter;

      return matchesSearch && matchesBank && matchesStatus && matchesUser;
    });
  }, [alerts, searchQuery, bankFilter, statusFilter, userFilter]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: alerts.length,
      pending: alerts.filter((a) => a.status === "pending").length,
      today: alerts.filter((a) => {
        const alertDate = new Date(a.alert_date);
        return isToday(alertDate) && a.status === "pending";
      }).length,
      overdue: alerts.filter((a) => {
        const alertDate = new Date(a.alert_date);
        return isPast(alertDate) && !isToday(alertDate) && a.status === "pending";
      }).length,
      upcoming: alerts.filter((a) => {
        const alertDate = new Date(a.alert_date);
        return isFuture(alertDate) && differenceInDays(alertDate, today) <= 7 && a.status === "pending";
      }).length,
      converted: alerts.filter((a) => a.status === "converted").length,
    };
  }, [alerts]);

  const getAlertPriority = (alert: ClientReuseAlert) => {
    if (alert.status !== "pending") return "normal";
    
    const alertDate = new Date(alert.alert_date);
    if (isPast(alertDate) && !isToday(alertDate)) return "overdue";
    if (isToday(alertDate)) return "today";
    if (differenceInDays(alertDate, new Date()) <= 7) return "upcoming";
    return "future";
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "overdue":
        return "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case "today":
        return "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20";
      case "upcoming":
        return "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20";
      default:
        return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "notified":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Bell className="h-3 w-3 mr-1" />Notificado</Badge>;
      case "converted":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Convertido</Badge>;
      case "dismissed":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Dispensado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openAlertDetail = (alert: ClientReuseAlert) => {
    setSelectedAlert(alert);
    setActionNotes(alert.notes || "");
    setIsDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Alertas de Reaproveitamento
          </h1>
          <p className="text-sm text-muted-foreground">
            Clientes aptos para nova operação
          </p>
        </div>
        <Button variant="outline" onClick={fetchAlerts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.today}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.upcoming}</p>
            <p className="text-xs text-muted-foreground">Próx. 7 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-primary/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.converted}</p>
            <p className="text-xs text-muted-foreground">Convertidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Bancos</SelectItem>
                {uniqueBanks.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="notified">Notificado</SelectItem>
                <SelectItem value="converted">Convertido</SelectItem>
                <SelectItem value="dismissed">Dispensado</SelectItem>
              </SelectContent>
            </Select>
            {(isAdmin || isGestor) && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Vendedores</SelectItem>
                  {uniqueUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-center">Data Pagamento</TableHead>
                  <TableHead className="text-center">Data Alerta</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {(isAdmin || isGestor) && <TableHead>Vendedor</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin || isGestor ? 7 : 6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Bell className="h-8 w-8" />
                        <p>Nenhum alerta encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => {
                    const priority = getAlertPriority(alert);
                    return (
                      <TableRow
                        key={alert.id}
                        className={`cursor-pointer hover:bg-muted/50 ${getPriorityStyles(priority)}`}
                        onClick={() => openAlertDetail(alert)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{alert.client_name}</span>
                            {alert.client_phone && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {alert.client_phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {alert.bank_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {format(new Date(alert.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className={priority === "overdue" ? "text-red-600 font-medium" : priority === "today" ? "text-green-600 font-medium" : ""}>
                              {format(new Date(alert.alert_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {priority === "overdue" && (
                              <span className="text-xs text-red-500">Atrasado</span>
                            )}
                            {priority === "today" && (
                              <span className="text-xs text-green-500">Hoje!</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(alert.status)}
                        </TableCell>
                        {(isAdmin || isGestor) && (
                          <TableCell>
                            <span className="text-sm">
                              {profiles[alert.user_id]?.name || "—"}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Detalhes do Alerta
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedAlert.client_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Banco</Label>
                  <p className="font-medium">{selectedAlert.bank_name}</p>
                </div>
                {selectedAlert.client_phone && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedAlert.client_phone}
                    </p>
                  </div>
                )}
                {selectedAlert.client_cpf && (
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="font-medium">{selectedAlert.client_cpf}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">Data Pagamento</Label>
                  <p className="font-medium">
                    {format(new Date(selectedAlert.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prazo</Label>
                  <p className="font-medium">{selectedAlert.reuse_months} meses</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Data para Nova Operação</p>
                    <p className="text-lg font-bold text-primary">
                      {format(new Date(selectedAlert.alert_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {getAlertPriority(selectedAlert) === "today" && (
                    <Badge className="bg-green-500">Hoje!</Badge>
                  )}
                  {getAlertPriority(selectedAlert) === "overdue" && (
                    <Badge variant="destructive">Atrasado</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Adicione observações sobre este cliente..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {selectedAlert.status === "pending" && (
                  <>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleUpdateStatus(selectedAlert.id, "converted", actionNotes)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Convertido (Nova Venda)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleUpdateStatus(selectedAlert.id, "notified", actionNotes)}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Marcar como Notificado
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleUpdateStatus(selectedAlert.id, "dismissed", actionNotes)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Dispensar Alerta
                    </Button>
                  </>
                )}
                {selectedAlert.status === "notified" && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleUpdateStatus(selectedAlert.id, "converted", actionNotes)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Convertido (Nova Venda)
                  </Button>
                )}
              </div>

              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Status atual: {getStatusBadge(selectedAlert.status)}
                {selectedAlert.notified_at && (
                  <p className="mt-1">
                    Notificado em: {format(new Date(selectedAlert.notified_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
