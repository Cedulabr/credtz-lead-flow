import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

interface TreatmentLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  newStatus: string;
  onConfirm: () => void;
}

const TREATMENT_STATUSES = [
  { value: "contacted", label: "Contatado" },
  { value: "no_answer", label: "Sem Atendimento" },
  { value: "scheduled", label: "Agendamento" },
  { value: "not_interested", label: "Sem Interesse" },
  { value: "no_possibility", label: "Sem Possibilidade" },
  { value: "wrong_number", label: "Número Errado" },
  { value: "callback", label: "Retorno Futuro" },
  { value: "closed", label: "Fechado" },
];

export function TreatmentLogDialog({
  isOpen,
  onClose,
  leadId,
  leadName,
  newStatus,
  onConfirm,
}: TreatmentLogDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    status: newStatus === "sem_interesse" ? "not_interested" : 
            newStatus === "cliente_fechado" ? "closed" :
            newStatus === "agendamento" ? "scheduled" :
            newStatus === "sem_possibilidade" ? "no_possibility" : "contacted",
    contactDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: "",
    followUpDate: "",
  });

  const isNoAnswer = form.status === "no_answer";

  const handleSubmit = async () => {
    if (!form.notes.trim()) {
      toast({ title: "Preencha as observações", variant: "destructive" });
      return;
    }

    if (isNoAnswer && !form.followUpDate) {
      toast({ title: "Defina a data de retorno para leads sem atendimento", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert treatment log
      const { error } = await supabase
        .from('lead_treatment_log')
        .insert({
          lead_id: leadId,
          user_id: user!.id,
          status: form.status,
          contact_date: new Date(form.contactDate).toISOString(),
          notes: form.notes,
          follow_up_date: isNoAnswer && form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
          follow_up_completed: false,
        });

      if (error) throw error;

      // Mark lead as treated
      await supabase
        .from('leads')
        .update({
          treated_at: new Date().toISOString(),
          treatment_status: 'treated',
        })
        .eq('id', leadId);

      toast({ title: "Tratamento registrado com sucesso" });
      onConfirm();
      onClose();
    } catch (error: any) {
      console.error('Error logging treatment:', error);
      toast({ title: "Erro ao registrar tratamento", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Registrar Tratamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Registre o tratamento do lead <strong>{leadName}</strong> antes de alterar o status.
          </p>

          <div className="space-y-2">
            <Label>Tipo de Contato</Label>
            <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TREATMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data/Hora do Contato</Label>
            <Input 
              type="datetime-local" 
              value={form.contactDate}
              onChange={(e) => setForm(p => ({ ...p, contactDate: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações *</Label>
            <Textarea 
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Descreva o resultado do contato..."
              rows={3}
            />
          </div>

          {isNoAnswer && (
            <div className="space-y-2 p-3 rounded-md bg-amber-50 border border-amber-200">
              <Label className="text-amber-700">Data do Retorno (obrigatório para "Sem Atendimento")</Label>
              <Input 
                type="datetime-local"
                value={form.followUpDate}
                onChange={(e) => setForm(p => ({ ...p, followUpDate: e.target.value }))}
              />
              <p className="text-xs text-amber-600">
                Você será lembrado de entrar em contato novamente nesta data.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              "Confirmar e Alterar Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
