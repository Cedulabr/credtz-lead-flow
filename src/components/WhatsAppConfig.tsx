import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Save, Loader2, CheckCircle, XCircle, RefreshCw, Send, History, Plus, Trash2, Edit, Phone, Clock, Ban } from "lucide-react";
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
}

export function WhatsAppConfig() {
  const { user } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Instance form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "error">>({});

  const fetchInstances = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any)
      .from("whatsapp_instances")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setInstances(data || []);
  }, [user?.id]);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any)
      .from("whatsapp_messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setMessages(data || []);
  }, [user?.id]);

  const fetchScheduled = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any)
      .from("whatsapp_scheduled_messages")
      .select("*, whatsapp_instances(instance_name, phone_number)")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });
    setScheduled(data || []);
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchInstances(), fetchMessages(), fetchScheduled()]);
      setLoading(false);
    };
    load();
  }, [fetchInstances, fetchMessages, fetchScheduled]);

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormToken("");
    setFormPhone("");
    setShowForm(true);
  };

  const openEditForm = (inst: Instance) => {
    setEditingId(inst.id);
    setFormName(inst.instance_name || "");
    setFormToken(inst.api_token || "");
    setFormPhone(inst.phone_number || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user?.id || !formToken.trim()) {
      toast.error("Informe o token de acesso");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await (supabase as any)
          .from("whatsapp_instances")
          .update({ api_token: formToken, instance_name: formName || "Principal", phone_number: formPhone || null })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: ucData } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        const { error } = await (supabase as any)
          .from("whatsapp_instances")
          .insert({
            user_id: user.id,
            instance_name: formName || "Principal",
            api_token: formToken,
            phone_number: formPhone || null,
            instance_status: "configured",
            company_id: ucData?.company_id || null,
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
          <MessageCircle className="h-8 w-8 text-green-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas instâncias e envios via API Ticketz</p>
        </div>
        <Button onClick={openNewForm} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Instância
        </Button>
      </div>

      <Tabs defaultValue="instances">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instances">Instâncias ({instances.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="scheduled">Agendamentos ({scheduled.filter(s => s.status === "pending").length})</TabsTrigger>
        </TabsList>

        {/* Instances Tab */}
        <TabsContent value="instances" className="space-y-4">
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
              <Card key={inst.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{inst.instance_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {inst.phone_number || "Sem número"}
                    </p>
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
                  <Button variant="outline" size="sm" onClick={() => handleTest(inst)} disabled={testing === inst.id}>
                    {testing === inst.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(inst)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(inst.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
            <DialogTitle>{editingId ? "Editar Instância" : "Nova Instância"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Instância</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: WhatsApp Vendas" />
            </div>
            <div>
              <Label>Número do WhatsApp</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="85 99999-9999" />
            </div>
            <div>
              <Label>Token de Acesso (API)</Label>
              <Input value={formToken} onChange={(e) => setFormToken(e.target.value)} placeholder="Cole seu token aqui..." type="password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
