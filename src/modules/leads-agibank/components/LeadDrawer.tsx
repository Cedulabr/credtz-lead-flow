import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle } from "lucide-react";
import { AgibankLead, AgibankLeadStatus, STATUS_LABELS, STATUS_ORDER, STATUS_COLORS, normalizePhone } from "../types";

interface Props {
  lead: AgibankLead | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: AgibankLeadStatus, extra?: Partial<AgibankLead>) => Promise<boolean>;
  onSaveNotes: (leadId: string, notes: string) => Promise<boolean>;
  onApiWhatsApp: (lead: AgibankLead) => void;
  onUpdateLead?: (leadId: string, patch: Partial<AgibankLead>) => Promise<boolean>;
  canReassign?: boolean;
  onReassign?: (leadId: string, agentId: string | null) => Promise<boolean>;
  agents?: Array<{ id: string; name: string | null; email: string | null }>;
  agentName?: string | null;
}

export function LeadDrawer({
  lead, open, onClose, onStatusChange, onSaveNotes, onApiWhatsApp, onUpdateLead,
  canReassign, onReassign, agents, agentName,
}: Props) {
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [cpf, setCpf] = useState("");

  useEffect(() => {
    setNotes(lead?.notes || "");
    setScheduledAt(lead?.scheduled_at ? lead.scheduled_at.slice(0, 16) : "");
    setCpf(lead?.document || "");
  }, [lead]);

  if (!lead) return null;

  const handleStatusSelect = async (v: string) => {
    const status = v as AgibankLeadStatus;
    if (status === "agendado") {
      if (!scheduledAt) {
        const def = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
        setScheduledAt(def);
        await onStatusChange(lead.id, "agendado", { scheduled_at: new Date(def).toISOString() });
      } else {
        await onStatusChange(lead.id, "agendado", { scheduled_at: new Date(scheduledAt).toISOString() });
      }
    } else {
      await onStatusChange(lead.id, status);
    }
  };

  const handleScheduledChange = async (v: string) => {
    setScheduledAt(v);
    if (lead.status === "agendado" && v) {
      await onStatusChange(lead.id, "agendado", { scheduled_at: new Date(v).toISOString() });
    }
  };

  const handleSaveCpf = async () => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned === (lead.document || "")) return;
    if (cleaned && (cleaned.length < 11 || cleaned.length > 11)) {
      return;
    }
    await onUpdateLead?.(lead.id, { document: cleaned || null });
  };

  const phones: Array<{ label: string; value: string }> = [
    { label: "Telefone 1", value: lead.phone },
    ...(lead.phone2 ? [{ label: "Telefone 2", value: lead.phone2 }] : []),
    ...(lead.phone3 ? [{ label: "Telefone 3", value: lead.phone3 }] : []),
    ...(lead.phone4 ? [{ label: "Telefone 4", value: lead.phone4 }] : []),
    ...(lead.phone5 ? [{ label: "Telefone 5", value: lead.phone5 }] : []),
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {lead.name}
            <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
            {lead.tag && <Badge variant="outline">{lead.tag}</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Telefones</Label>
            {phones.map((p) => {
              const n = normalizePhone(p.value);
              return (
                <div key={p.label} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">{p.label}</p>
                    <p className="font-mono text-sm truncate">{p.value}</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onApiWhatsApp({ ...lead, phone: p.value })}
                  >
                    <Send className="h-4 w-4 mr-1" /> API
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/55${n}`, "_blank")}>
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">CPF (opcional)</Label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              onBlur={handleSaveCpf}
              placeholder="Apenas números"
              inputMode="numeric"
              maxLength={14}
            />
          </div>

          {agentName && (
            <div>
              <Label className="text-xs text-muted-foreground">Agente</Label>
              <p className="text-sm">{agentName}</p>
            </div>
          )}

          <div>
            <Label>Status</Label>
            <Select value={lead.status} onValueChange={handleStatusSelect}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {lead.status === "agendado" && (
            <div>
              <Label>Agendado para</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={e => handleScheduledChange(e.target.value)} />
            </div>
          )}

          {canReassign && agents && (
            <div>
              <Label>Reatribuir agente</Label>
              <Select value={lead.agent_id || ""} onValueChange={(v) => onReassign?.(lead.id, v || null)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name || a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Anotações</Label>
            <Textarea
              rows={5}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => notes !== (lead.notes || "") && onSaveNotes(lead.id, notes)}
              placeholder="Observações sobre o contato..."
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
