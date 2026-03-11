import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, Save, Loader2, CheckCircle, XCircle, RefreshCw, Send,
  History, Plus, Trash2, Edit, Phone, Clock, Ban, Building2, User, Shield, Users
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Instance {
  id: string;
  instance_name: string;
  api_token: string | null;
  phone_number: string | null;
  instance_status: string | null;
  created_at: string;
  user_id: string;
  company_id: string | null;
  user_name?: string;
  user_email?: string;
  company_name?: string;
}

interface CompanyUser {
  user_id: string;
  name: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
}

type UserRole = "admin" | "gestor" | "colaborador";

export function WhatsAppConfig() {
  const { user, profile } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("colaborador");
  const [myCompanyId, setMyCompanyId] = useState<string | null>(null);

  // Company & user lists for form
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);

  // Instance form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});

  // Detect user role
  useEffect(() => {
    if (!user?.id) return;
    const detectRole = async () => {
      if (profile?.role === "admin") {
        setRole("admin");
        return;
      }
      const { data } = await supabase
        .from("user_companies")
        .select("company_id, company_role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (data) {
        setMyCompanyId(data.company_id);
        if (data.company_role === "gestor") {
          setRole("gestor");
        } else {
          setRole("colaborador");
        }
      }
    };
    detectRole();
  }, [user?.id, profile?.role]);

  // Fetch companies for admin
  useEffect(() => {
    if (role !== "admin") return;
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setCompanies(data || []);
    };
    fetchCompanies();
  }, [role]);

  // Fetch company users (for gestor: own company; for admin: selected company)
  const fetchCompanyUsers = useCallback(async (companyId: string) => {
    if (!companyId) { setCompanyUsers([]); return; }
    // Step 1: get user_ids from company
    const { data: ucData } = await supabase
      .from("user_companies")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("is_active", true);
    const userIds = (ucData || []).map(d => d.user_id);
    if (userIds.length === 0) { setCompanyUsers([]); return; }
    // Step 2: get profiles for those users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);
    const users: CompanyUser[] = (profilesData || []).map((p: any) => ({
      user_id: p.id,
      name: p.name || "",
      email: p.email || "",
    }));
    setCompanyUsers(users);
  }, []);

  useEffect(() => {
    if (role === "gestor" && myCompanyId) {
      fetchCompanyUsers(myCompanyId);
    }
  }, [role, myCompanyId, fetchCompanyUsers]);

  const fetchInstances = useCallback(async () => {
    if (!user?.id) return;
    let query = (supabase as any)
      .from("whatsapp_instances")
      .select("*")
      .order("created_at", { ascending: false });

    if (role === "colaborador") {
      query = query.eq("user_id", user.id);
    } else if (role === "gestor" && myCompanyId) {
      query = query.eq("company_id", myCompanyId);
    }

    const { data } = await query;
    const rawInstances = data || [];

    // Collect unique user_ids and company_ids for separate lookups
    const userIds = [...new Set(rawInstances.map((d: any) => d.user_id).filter(Boolean))] as string[];
    const companyIds = [...new Set(rawInstances.map((d: any) => d.company_id).filter(Boolean))] as string[];

    // Fetch profiles and companies in parallel
    const [profilesRes, companiesRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, name, email").in("id", userIds)
        : { data: [] },
      companyIds.length > 0
        ? supabase.from("companies").select("id, name").in("id", companyIds)
        : { data: [] },
    ]);

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const companiesMap = new Map((companiesRes.data || []).map((c: any) => [c.id, c]));

    const mapped: Instance[] = rawInstances.map((d: any) => {
      const prof = profilesMap.get(d.user_id);
      const comp = companiesMap.get(d.company_id);
      return {
        id: d.id,
        instance_name: d.instance_name,
        api_token: d.api_token,
        phone_number: d.phone_number,
        instance_status: d.instance_status,
        created_at: d.created_at,
        user_id: d.user_id,
        company_id: d.company_id,
        user_name: prof?.name || "",
        user_email: prof?.email || "",
        company_name: comp?.name || "",
      };
    });
    setInstances(mapped);
  }, [user?.id, role, myCompanyId]);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;

    // Build role-aware user IDs list
    let targetUserIds: string[] | null = null;
    if (role === "colaborador") {
      targetUserIds = [user.id];
    } else if (role === "gestor" && myCompanyId) {
      const { data: ucData } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", myCompanyId)
        .eq("is_active", true);
      targetUserIds = (ucData || []).map(u => u.user_id);
    }
    // admin: targetUserIds stays null → no filter

    let query = (supabase as any)
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (targetUserIds) {
      query = query.in("user_id", targetUserIds);
    }

    const { data } = await query;
    const rawMessages = data || [];

    // Enrich with user names for admin/gestor
    if (role !== "colaborador" && rawMessages.length > 0) {
      const uids = [...new Set(rawMessages.map((m: any) => m.user_id).filter(Boolean))] as string[];
      if (uids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));
        rawMessages.forEach((m: any) => { m._user_name = profileMap.get(m.user_id) || ""; });
      }
    }

    setMessages(rawMessages);
  }, [user?.id, role, myCompanyId]);

  const fetchScheduled = useCallback(async () => {
    if (!user?.id) return;

    let targetUserIds: string[] | null = null;
    if (role === "colaborador") {
      targetUserIds = [user.id];
    } else if (role === "gestor" && myCompanyId) {
      const { data: ucData } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", myCompanyId)
        .eq("is_active", true);
      targetUserIds = (ucData || []).map(u => u.user_id);
    }

    let query = (supabase as any)
      .from("whatsapp_scheduled_messages")
      .select("*, whatsapp_instances(instance_name, phone_number)")
      .order("scheduled_at", { ascending: true });

    if (targetUserIds) {
      query = query.in("user_id", targetUserIds);
    }

    const { data } = await query;
    const rawScheduled = data || [];

    if (role !== "colaborador" && rawScheduled.length > 0) {
      const uids = [...new Set(rawScheduled.map((m: any) => m.user_id).filter(Boolean))] as string[];
      if (uids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", uids);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.name]));
        rawScheduled.forEach((m: any) => { m._user_name = profileMap.get(m.user_id) || ""; });
      }
    }

    setScheduled(rawScheduled);
  }, [user?.id, role, myCompanyId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchInstances(), fetchMessages(), fetchScheduled()]);
      setLoading(false);
    };
    if (user?.id && (role === "colaborador" || (role === "gestor" && myCompanyId) || role === "admin")) {
      load();
    }
  }, [fetchInstances, fetchMessages, fetchScheduled, user?.id, role, myCompanyId]);

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormToken("");
    setFormPhone("");
    setFormUserId("");
    setFormCompanyId(role === "gestor" ? (myCompanyId || "") : "");
    if (role === "admin") setCompanyUsers([]);
    setShowForm(true);
  };

  const openEditForm = (inst: Instance) => {
    setEditingId(inst.id);
    setFormName(inst.instance_name || "");
    setFormToken(inst.api_token || "");
    setFormPhone(inst.phone_number || "");
    setFormUserId(inst.user_id || "");
    setFormCompanyId(inst.company_id || "");
    if (inst.company_id && role === "admin") {
      fetchCompanyUsers(inst.company_id);
    }
    setShowForm(true);
  };

  const handleCompanyChange = (companyId: string) => {
    setFormCompanyId(companyId);
    setFormUserId("");
    fetchCompanyUsers(companyId);
  };

  const handleSave = async () => {
    if (!user?.id || !formToken.trim()) {
      toast.error("Informe o token de acesso");
      return;
    }
    setSaving(true);
    try {
      const targetUserId = (role === "gestor" || role === "admin") && formUserId ? formUserId : user.id;
      const targetCompanyId = role === "admin" && formCompanyId ? formCompanyId
        : role === "gestor" ? myCompanyId
        : null;

      // For colaborador, get their company
      let finalCompanyId = targetCompanyId;
      if (role === "colaborador" && !finalCompanyId) {
        const { data: ucData } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        finalCompanyId = ucData?.company_id || null;
      }

      if (editingId) {
        const updateData: any = {
          api_token: formToken,
          instance_name: formName || "Principal",
          phone_number: formPhone || null,
        };
        if (role === "gestor" || role === "admin") {
          updateData.user_id = targetUserId;
        }
        if (role === "admin") {
          updateData.company_id = finalCompanyId;
        }
        const { error } = await (supabase as any)
          .from("whatsapp_instances")
          .update(updateData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("whatsapp_instances")
          .insert({
            user_id: targetUserId,
            instance_name: formName || "Principal",
            api_token: formToken,
            phone_number: formPhone || null,
            instance_status: "configured",
            company_id: finalCompanyId,
          });
        if (error) throw error;
      }
      toast.success("Instância salva!");
      setShowForm(false);
      fetchInstances();
    } catch (e: any) {
      console.error("Error saving instance:", e);
      toast.error("Erro ao salvar instância");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("whatsapp_instances")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Instância removida");
      fetchInstances();
    } catch {
      toast.error("Erro ao remover instância");
    }
  };

  const handleTest = async (inst: Instance) => {
    if (!inst.api_token) return;
    setTesting(inst.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { apiToken: inst.api_token, testMode: true },
      });
      if (error) throw error;
      if (data?.success) {
        setTestResults(prev => ({ ...prev, [inst.id]: "success" }));
        toast.success("Conexão funcionando!");
      } else {
        setTestResults(prev => ({ ...prev, [inst.id]: "error" }));
        toast.error(data?.error || "Erro de conexão");
      }
    } catch (e: any) {
      console.error("Test error:", e);
      setTestResults(prev => ({ ...prev, [inst.id]: "error" }));
      toast.error("Não foi possível conectar à API");
    } finally {
      setTesting(null);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("whatsapp_scheduled_messages")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Agendamento cancelado");
      fetchScheduled();
    } catch {
      toast.error("Erro ao cancelar");
    }
  };

  const getRoleBadge = () => {
    if (role === "admin") return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
    if (role === "gestor") return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><Users className="h-3 w-3" />Gestor</Badge>;
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
            <MessageCircle className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">WhatsApp</h1>
              {getRoleBadge()}
            </div>
            <p className="text-white/80 text-sm mt-1">
              {role === "admin"
                ? "Gerencie todas as instâncias do sistema"
                : role === "gestor"
                ? "Gerencie as instâncias da sua empresa"
                : "Gerencie suas instâncias via API Ticketz"}
            </p>
          </div>
          <Button onClick={openNewForm} className="gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white">
            <Plus className="h-4 w-4" /> Nova Instância
          </Button>
        </div>
        {/* Stats bar */}
        <div className="relative mt-4 flex gap-6">
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <Phone className="h-4 w-4" />
            <span className="font-semibold">{instances.length}</span> instâncias
          </div>
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span className="font-semibold">{instances.filter(i => i.api_token).length}</span> configuradas
          </div>
        </div>
      </div>

      <Tabs defaultValue="instances">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instances">Instâncias ({instances.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="scheduled">Agendamentos ({scheduled.filter(s => s.status === "pending").length})</TabsTrigger>
        </TabsList>

        {/* Instances Tab */}
        <TabsContent value="instances" className="space-y-3">
          {instances.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma instância cadastrada</p>
                <Button variant="link" onClick={openNewForm}>Adicionar agora</Button>
              </CardContent>
            </Card>
          ) : (
            instances.map(inst => (
              <Card key={inst.id} className="group hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{inst.instance_name}</p>
                      {inst.api_token && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                          Configurada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {inst.phone_number || "Sem número"}
                    </p>
                    {/* Show linked user/company for gestor/admin */}
                    {(role === "gestor" || role === "admin") && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {inst.user_name || inst.user_email || "Sem vínculo"}
                        </span>
                        {role === "admin" && inst.company_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {inst.company_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {testResults[inst.id] === "success" && (
                    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                      <CheckCircle className="h-3 w-3" /> OK
                    </Badge>
                  )}
                  {testResults[inst.id] === "error" && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> Erro
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" onClick={() => handleTest(inst)} disabled={testing === inst.id} title="Testar conexão">
                      {testing === inst.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditForm(inst)} title="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(inst.id)} title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" /> Histórico de Mensagens
                </CardTitle>
                <CardDescription>Últimas 50 mensagens enviadas</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchMessages}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma mensagem enviada ainda</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        {role !== "colaborador" && <TableHead>Usuário</TableHead>}
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="text-xs">
                            {msg.created_at ? format(new Date(msg.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : "-"}
                          </TableCell>
                          {role !== "colaborador" && (
                            <TableCell className="text-xs">{msg._user_name || "-"}</TableCell>
                          )}
                          <TableCell className="font-mono text-xs">{msg.phone}</TableCell>
                          <TableCell className="text-xs">{msg.client_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{msg.message_type || "text"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={msg.status === "sent" ? "default" : "destructive"} className="text-xs">
                              {msg.status === "sent" ? "Enviado" : "Falhou"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Mensagens Agendadas
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchScheduled}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {scheduled.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma mensagem agendada</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agendado para</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Instância</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduled.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="text-xs">
                            {format(new Date(msg.scheduled_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{msg.phone}</TableCell>
                          <TableCell className="text-xs">{msg.client_name || "-"}</TableCell>
                          <TableCell className="text-xs">
                            {msg.whatsapp_instances?.instance_name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={msg.status === "sent" ? "default" : msg.status === "pending" ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {msg.status === "pending" ? "Pendente" : msg.status === "sent" ? "Enviado" : msg.status === "cancelled" ? "Cancelado" : "Falhou"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {msg.status === "pending" && (
                              <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => handleCancelScheduled(msg.id)}>
                                <Ban className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Instance Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              {editingId ? "Editar Instância" : "Nova Instância"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Admin: select company */}
            {role === "admin" && (
              <div>
                <Label className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Empresa
                </Label>
                <Select value={formCompanyId} onValueChange={handleCompanyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Gestor or Admin: select user */}
            {(role === "gestor" || (role === "admin" && formCompanyId)) && (
              <div>
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Vincular ao Usuário
                </Label>
                <Select value={formUserId} onValueChange={setFormUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companyUsers.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Nome da Instância</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: WhatsApp Vendas" />
            </div>
            <div>
              <Label>Número do WhatsApp</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="85 99999-9999" />
            </div>
            <div>
              <Label>Token de Acesso (Easyn)</Label>
              <Input value={formToken} onChange={(e) => setFormToken(e.target.value)} placeholder="Cole o token configurado na conexão Easyn" type="password" />
              <p className="text-xs text-muted-foreground mt-1">
                Token cadastrado na conexão do chat Easyn. Acesse Conexões &gt; Editar &gt; copie o token.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
