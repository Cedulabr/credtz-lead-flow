import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Televenda,
  STATUS_PROPOSTA_OPTIONS,
  MOTIVO_PENDENCIA_OPTIONS,
} from "../types";
import { formatDateTime } from "../utils";
import { addBusinessDays } from "../utils/businessDays";

interface StatusPropostaEditorProps {
  televenda: Televenda;
  onUpdate: () => void;
  isGestorOrAdmin: boolean;
  readOnly?: boolean;
}

export const StatusPropostaEditor = ({
  televenda,
  onUpdate,
  isGestorOrAdmin,
  readOnly = false,
}: StatusPropostaEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showPendenciaDialog, setShowPendenciaDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [motivoPendencia, setMotivoPendencia] = useState("");
  const [motivoDescricao, setMotivoDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const currentStatus = televenda.status_proposta || "digitada";
  const currentConfig = STATUS_PROPOSTA_OPTIONS.find(s => s.value === currentStatus);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "pendente") {
      setPendingStatus(newStatus);
      setMotivoPendencia("");
      setMotivoDescricao("");
      setShowPendenciaDialog(true);
      return;
    }
    await saveStatusChange(newStatus);
  };

  const saveStatusChange = async (newStatus: string, motivo?: string, descricao?: string) => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        status_proposta: newStatus,
        status_proposta_updated_at: new Date().toISOString(),
      };

      // Limpar pendência se não for pendente
      if (newStatus !== "pendente") {
        updateData.motivo_pendencia = null;
        updateData.motivo_pendencia_descricao = null;
      } else {
        updateData.motivo_pendencia = motivo || null;
        updateData.motivo_pendencia_descricao = descricao || null;
      }

      // Auto-calcular previsão de saldo para Portabilidade quando status = digitada
      if (newStatus === "digitada" && televenda.tipo_operacao === "Portabilidade") {
        const previsao = addBusinessDays(new Date(), 5);
        updateData.previsao_saldo = previsao.toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("televendas")
        .update(updateData)
        .eq("id", televenda.id);

      if (error) throw error;

      // Registrar histórico
      await supabase
        .from("televendas_status_proposta_history")
        .insert({
          televendas_id: televenda.id,
          from_status: currentStatus,
          to_status: newStatus,
          changed_by: user?.id || "",
          reason: motivo ? `${MOTIVO_PENDENCIA_OPTIONS.find(m => m.value === motivo)?.label || motivo}${descricao ? ` - ${descricao}` : ""}` : null,
        });

      toast({ title: "✅ Status da proposta atualizado" });
      onUpdate();
    } catch (error) {
      console.error("Error updating status_proposta:", error);
      toast({ title: "Erro", description: "Erro ao atualizar status da proposta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPendencia = async () => {
    if (!motivoPendencia) {
      toast({ title: "Selecione o motivo da pendência", variant: "destructive" });
      return;
    }
    if (motivoPendencia === "outros" && !motivoDescricao.trim()) {
      toast({ title: "Descreva o motivo da pendência", variant: "destructive" });
      return;
    }
    setShowPendenciaDialog(false);
    await saveStatusChange("pendente", motivoPendencia, motivoDescricao);
  };

  return (
    <div className="space-y-3">
      {/* Status da Proposta */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Status da Proposta
        </Label>
        {readOnly ? (
          <Badge variant="outline" className={`${currentConfig?.bgColor || ""} ${currentConfig?.color || ""} py-1.5 px-3`}>
            {currentConfig?.emoji} {currentConfig?.label || currentStatus}
          </Badge>
        ) : (
          <Select value={currentStatus} onValueChange={handleStatusChange} disabled={saving}>
            <SelectTrigger className="h-10" onClick={(e) => e.stopPropagation()}>
              <SelectValue>
                {currentConfig?.emoji} {currentConfig?.label || currentStatus}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_PROPOSTA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Última atualização */}
      {televenda.status_proposta_updated_at && (
        <p className="text-xs text-muted-foreground">
          Última atualização: {formatDateTime(televenda.status_proposta_updated_at)}
        </p>
      )}

      {/* Motivo da Pendência (visível quando pendente) */}
      {currentStatus === "pendente" && televenda.motivo_pendencia && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-300 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-yellow-700">
            <AlertTriangle className="h-4 w-4" />
            Pendência: {MOTIVO_PENDENCIA_OPTIONS.find(m => m.value === televenda.motivo_pendencia)?.label || televenda.motivo_pendencia}
          </div>
          {televenda.motivo_pendencia_descricao && (
            <p className="text-xs text-yellow-600">{televenda.motivo_pendencia_descricao}</p>
          )}
        </div>
      )}

      {/* Previsão de Saldo (Portabilidade) */}
      {televenda.tipo_operacao === "Portabilidade" && televenda.previsao_saldo && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-300 space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700">
            <CalendarDays className="h-4 w-4" />
            Previsão de Saldo
          </div>
          {isGestorOrAdmin && !readOnly ? (
            <input
              type="date"
              value={televenda.previsao_saldo}
              className="text-sm border rounded px-2 py-1 bg-background"
              onClick={(e) => e.stopPropagation()}
              onChange={async (e) => {
                const newDate = e.target.value;
                if (!newDate) return;
                await supabase.from("televendas").update({ previsao_saldo: newDate }).eq("id", televenda.id);
                toast({ title: "Previsão de saldo atualizada" });
                onUpdate();
              }}
            />
          ) : (
            <p className="text-sm text-blue-600 font-medium">
              {new Date(televenda.previsao_saldo + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      )}

      {/* Dialog para Pendência */}
      <Dialog open={showPendenciaDialog} onOpenChange={setShowPendenciaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Motivo da Pendência
            </DialogTitle>
            <DialogDescription>
              Selecione o motivo e descreva se necessário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={motivoPendencia} onValueChange={setMotivoPendencia}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVO_PENDENCIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(motivoPendencia === "outros" || motivoDescricao) && (
              <Textarea
                placeholder="Descreva o motivo..."
                value={motivoDescricao}
                onChange={(e) => setMotivoDescricao(e.target.value)}
                rows={3}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPendenciaDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmPendencia} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
