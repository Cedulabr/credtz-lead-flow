import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, MessageSquare, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../types";

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onConfirm: () => void;
}

export function ScheduleModal({ open, onOpenChange, lead, onConfirm }: ScheduleModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!lead || !date) {
      toast.error("Selecione uma data para o agendamento");
      return;
    }

    setSaving(true);
    try {
      // Update lead with schedule info
      const historyEntry = {
        action: 'scheduled',
        timestamp: new Date().toISOString(),
        note: notes || 'Agendamento de contato futuro',
        scheduled_date: date,
        scheduled_time: time,
      };

      const currentHistory = Array.isArray(lead.history) ? lead.history : 
        (typeof lead.history === 'string' ? JSON.parse(lead.history) : []);

      await supabase
        .from('leads')
        .update({
          status: 'agendamento',
          future_contact_date: `${date}T${time}:00`,
          future_contact_time: time,
          notes: notes || lead.notes,
          history: JSON.stringify([...currentHistory, historyEntry]),
        })
        .eq('id', lead.id);

      // Schedule SMS if enabled
      if (smsEnabled && smsMessage.trim()) {
        const personalizedSms = smsMessage
          .replace(/\{\{nome\}\}/g, lead.name || "");

        await supabase.from('sms_scheduled_messages' as any).insert({
          lead_id: lead.id,
          phone: lead.phone,
          message: personalizedSms,
          scheduled_at: `${date}T${time}:00`,
          status: 'scheduled',
          send_type: 'agendamento',
        });
      }

      // Schedule WhatsApp if enabled
      if (whatsappEnabled && whatsappMessage.trim()) {
        const personalizedWa = whatsappMessage
          .replace(/\{\{nome\}\}/g, lead.name || "");

        await (supabase as any).from('autolead_messages').insert({
          lead_id: lead.id,
          lead_name: lead.name,
          phone: lead.phone,
          message: personalizedWa,
          scheduled_at: `${date}T${time}:00`,
          status: 'scheduled',
          whatsapp_instance_id: 'manual_schedule',
          job_id: null,
        });
      }

      toast.success("Agendamento salvo com sucesso!");
      onConfirm();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao agendar:", error);
      toast.error("Erro ao salvar agendamento");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDate("");
    setTime("09:00");
    setNotes("");
    setSmsEnabled(false);
    setSmsMessage("");
    setWhatsappEnabled(false);
    setWhatsappMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agendar Contato — {lead?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Horário
              </Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Observação</Label>
            <Textarea
              placeholder="Ex: Cliente pediu retorno na sexta..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* SMS Toggle */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Agendar SMS
              </Label>
              <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
            </div>
            {smsEnabled && (
              <Textarea
                placeholder="Mensagem SMS... Use {{nome}} para personalizar"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={2}
                className="text-xs"
              />
            )}
          </div>

          {/* WhatsApp Toggle */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500" />
                Agendar WhatsApp
              </Label>
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>
            {whatsappEnabled && (
              <Textarea
                placeholder="Mensagem WhatsApp... Use {{nome}} para personalizar"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={2}
                className="text-xs"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !date}>
            {saving ? "Salvando..." : "Confirmar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}