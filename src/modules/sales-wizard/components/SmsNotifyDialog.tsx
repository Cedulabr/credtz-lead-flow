import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SmsNotifyDialogProps {
  open: boolean;
  onComplete: () => void;
  clientName: string;
  clientPhone: string;
  televendasId?: string;
}

export function SmsNotifyDialog({ open, onComplete, clientName, clientPhone, televendasId }: SmsNotifyDialogProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleNotify = async () => {
    if (!user || !clientPhone) { onComplete(); return; }
    setLoading(true);
    try {
      // Get company info
      const { data: ucData } = await supabase
        .from("user_companies")
        .select("company_id, companies:company_id(name)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const companyId = ucData?.company_id || null;
      const empresaNome = (ucData as any)?.companies?.name || "Empresa";
      const consultorNome = profile?.name || "Consultor";

      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 2);

      const { error } = await (supabase as any).from("sms_proposal_notifications").insert({
        televendas_id: televendasId || null,
        cliente_nome: clientName,
        cliente_telefone: clientPhone.replace(/\D/g, ""),
        consultor_nome: consultorNome,
        empresa_nome: empresaNome,
        scheduled_at: scheduledAt.toISOString(),
        company_id: companyId,
        user_id: user.id,
      });

      if (error) throw error;
      toast.success("SMS agendado para 2 horas!");
    } catch (e: any) {
      console.error("Error scheduling SMS:", e);
      toast.error("Erro ao agendar SMS");
    } finally {
      setLoading(false);
      onComplete();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onComplete()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Notificar cliente via SMS?</DialogTitle>
          <DialogDescription className="text-center">
            O cliente receberá uma mensagem SMS em <strong>2 horas</strong> informando sobre a proposta.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>O SMS será enviado automaticamente após 2 horas. Você pode gerenciar esta automação em <strong>Comunicação SMS → Automação</strong>.</span>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onComplete} disabled={loading} className="flex-1">
            Não, obrigado
          </Button>
          <Button onClick={handleNotify} disabled={loading} className="flex-1 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Sim, notificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
