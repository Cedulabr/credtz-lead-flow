import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Save, Loader2, CheckCircle, XCircle, RefreshCw, Send, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function WhatsAppConfig() {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInstance = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("whatsapp_instances")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setToken(data.api_token || "");
        setInstanceName(data.instance_name || "");
        setInstanceId(data.id);
      }
    } catch (e) {
      console.error("Error fetching instance:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await (supabase as any)
        .from("whatsapp_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setMessages(data || []);
    } catch (e) {
      console.error("Error fetching messages:", e);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchInstance();
    fetchMessages();
  }, [fetchInstance, fetchMessages]);

  const handleSave = async () => {
    if (!user?.id || !token.trim()) {
      toast.error("Informe o token de acesso");
      return;
    }
    setSaving(true);
    try {
      if (instanceId) {
        const { error } = await (supabase as any)
          .from("whatsapp_instances")
          .update({ api_token: token, instance_name: instanceName || "Principal" })
          .eq("id", instanceId);
        if (error) throw error;
      } else {
        // Get company_id
        const { data: ucData } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        const { data, error } = await (supabase as any)
          .from("whatsapp_instances")
          .insert({
            user_id: user.id,
            instance_name: instanceName || "Principal",
            api_token: token,
            instance_status: "configured",
            company_id: ucData?.company_id || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        setInstanceId(data?.id);
      }
      toast.success("Token salvo com sucesso!");
    } catch (e: any) {
      console.error("Error saving token:", e);
      toast.error("Erro ao salvar token");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!token) {
      toast.error("Salve o token primeiro");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Simple test: try to send to a test endpoint
      const response = await fetch("https://chat.easyn.digital:443/backend/api/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: "5500000000000",
          body: "Teste de conexão - ignorar",
          saveOnTicket: false,
        }),
      });
      // Even if it returns an error about invalid number, connection works
      if (response.status < 500) {
        setTestResult("success");
        toast.success("Conexão com a API funcionando!");
      } else {
        setTestResult("error");
        toast.error("Erro de conexão com a API");
      }
    } catch (e) {
      setTestResult("error");
      toast.error("Não foi possível conectar à API Ticketz");
    } finally {
      setTesting(false);
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
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground">Configure sua integração com WhatsApp via API Ticketz</p>
        </div>
      </div>

      {/* Token Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração do Token</CardTitle>
          <CardDescription>
            Insira o token de acesso gerado na sua conexão do Ticketz. 
            Acesse o menu "Conexões" no Ticketz, edite a conexão e copie o token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome da Instância</Label>
            <Input
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Ex: Meu WhatsApp"
            />
          </div>
          <div>
            <Label>Token de Acesso (API)</Label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole seu token aqui..."
              type="password"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Token
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !token} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Testar Conexão
            </Button>
            {testResult === "success" && (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                <CheckCircle className="h-3 w-3" /> Conectado
              </Badge>
            )}
            {testResult === "error" && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Erro
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Mensagens
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
                        <Badge variant="outline" className="text-xs">
                          {msg.message_type || "text"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={msg.status === "sent" ? "default" : "destructive"}
                          className="text-xs"
                        >
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
    </div>
  );
}
