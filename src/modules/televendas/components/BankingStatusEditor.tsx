import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { BANKING_STATUS_CONFIG, BANKING_STATUS_OPTIONS } from "./BankingPipeline";
import { SyncIndicator } from "./SyncIndicator";
import { Televenda } from "../types";

interface BankingStatusEditorProps {
  televenda: Televenda;
  onUpdate: () => void;
  isGestorOrAdmin: boolean;
}

export const BankingStatusEditor = ({ televenda, onUpdate, isGestorOrAdmin }: BankingStatusEditorProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const currentStatus = (televenda as any).status_bancario || "aguardando_digitacao";
  const lastSyncAt = (televenda as any).last_sync_at;

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("televendas")
        .update({
          status_bancario: newStatus,
          last_sync_at: new Date().toISOString(),
          last_sync_by: user?.id,
        } as any)
        .eq("id", televenda.id);
      if (error) throw error;

      // Record history
      await supabase.from("televendas_status_bancario_history").insert({
        televendas_id: televenda.id,
        from_status: currentStatus,
        to_status: newStatus,
        changed_by: user?.id,
      } as any);

      toast.success("Status bancário atualizado");
      onUpdate();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar status bancário");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("televendas")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_by: user?.id,
        } as any)
        .eq("id", televenda.id);
      if (error) throw error;
      toast.success("Verificação registrada");
      onUpdate();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao registrar sync");
    } finally {
      setLoading(false);
    }
  };

  const config = BANKING_STATUS_CONFIG[currentStatus];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Status Bancário</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={loading}
          className="h-7 gap-1 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      <Select value={currentStatus} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger className="h-9">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{config?.emoji}</span>
              <span className="text-sm">{config?.shortLabel || currentStatus}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(BANKING_STATUS_CONFIG).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SyncIndicator lastSyncAt={lastSyncAt} size="md" />
    </div>
  );
};
