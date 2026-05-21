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
  canReassign?: boolean;
  onReassign?: (leadId: string, agentId: string | null) => Promise<boolean>;
  agents?: Array<{ id: string; name: string | null; email: string | null }>;
  agentName?: string | null;
}

export function LeadDrawer({
  lead, open, onClose, onStatusChange, onSaveNotes, onApiWhatsApp,
  canReassign, onReassign, agents, agentName,
}: Props) {
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  useEffect(() => {
    setNotes(lead?.notes || "");
    setScheduledAt(lead?.scheduled_at ? lead.scheduled_at.slice(0, 16) : "");
  }, [lead]);

  if (!lead) return null;
  const phone = normalizePhone(lead.phone);

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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {lead.name}
            <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <p className="font-mono">{phone}</p>
            </div>
            {lead.document && (
              <div>
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <p className="font-mono">{lead.document}</p>
              </div>
            )}
            {agentName && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Agente</Label>
                <p>{agentName}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => onApiWhatsApp(lead)}>
              <Send className="h-4 w-4 mr-2" /> API WhatsApp
            </Button>
            <Button variant="outline" onClick={() => window.open(`https://wa.me/55${phone}`, "_blank")}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>

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
