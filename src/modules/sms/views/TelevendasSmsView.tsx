import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Phone, Play, Pause, Send, RefreshCw, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface QueueItem {
  id: string;
  televendas_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_operacao: string;
  status_proposta: string;
  automacao_status: string;
  automacao_ativa: boolean;
  dias_envio_total: number;
  dias_enviados: number;
  ultimo_envio_at: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  pausado: { label: "Pausado", variant: "secondary" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

export const TelevendasSmsView = () => {
  const { user, profile } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("sms_televendas_queue").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("automacao_status", filter);
    const { data } = await query.limit(200);
    setQueue((data as any[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const toggleAutomacao = async (item: QueueItem) => {
    setTogglingId(item.id);
    const newAtiva = !item.automacao_ativa;
    const newStatus = newAtiva ? "ativo" : "pausado";
    await supabase.from("sms_televendas_queue")
      .update({ automacao_ativa: newAtiva, automacao_status: newStatus } as any)
      .eq("id", item.id);
    toast.success(newAtiva ? "Automação reativada" : "Automação pausada");
    fetchQueue();
    setTogglingId(null);
  };

  const handleManualSend = async (item: QueueItem) => {
    setSendingId(item.id);
    try {
      const { data: settings } = await supabase.from("sms_automation_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "msg_em_andamento")
        .single();

      let message = settings?.setting_value || "Olá {{nome}}, sua proposta está em andamento.";
      message = message.replace(/\{\{nome\}\}/gi, item.cliente_nome || "");
      message = message.replace(/\{\{tipo_operacao\}\}/gi, item.tipo_operacao || "");

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          phone: item.cliente_telefone,
          message,
          televendas_id: item.televendas_id,
          send_type: "manual",
          contact_name: item.cliente_nome,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("SMS enviado com sucesso");
      } else {
        toast.error("Falha no envio: " + (data?.error || "erro"));
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSendingId(null);
    }
  };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Notificação SMS Televendas
        </h2>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchQueue} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
      ) : queue.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Phone className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum cliente na fila de SMS</p>
          <p className="text-sm">Clientes serão adicionados automaticamente ao criar propostas no Televendas</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Status Proposta</TableHead>
                <TableHead>Automação</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Último Envio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item, i) => {
                const badge = STATUS_BADGE[item.automacao_status] || STATUS_BADGE.ativo;
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium text-sm">{item.cliente_nome}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{item.cliente_telefone}</TableCell>
                    <TableCell className="text-xs">{item.tipo_operacao}</TableCell>
                    <TableCell className="text-xs">{item.status_proposta}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.dias_enviados}/{item.dias_envio_total} dias
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.ultimo_envio_at
                        ? new Date(item.ultimo_envio_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && item.automacao_status !== "finalizado" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleAutomacao(item)}
                            disabled={togglingId === item.id}
                            title={item.automacao_ativa ? "Pausar" : "Reativar"}
                          >
                            {item.automacao_ativa ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleManualSend(item)}
                          disabled={sendingId === item.id}
                          title="Enviar SMS manual"
                        >
                          {sendingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
