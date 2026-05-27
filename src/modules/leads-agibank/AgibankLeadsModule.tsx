import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Shield, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAgibankLeads } from "./hooks/useAgibankLeads";
import { useAgibankCredits } from "./hooks/useAgibankCredits";
import { FilterTabs } from "./components/FilterTabs";
import { LeadCard } from "./components/LeadCard";
import { LeadDrawer } from "./components/LeadDrawer";
import { ImportModal } from "./components/ImportModal";
import { CreditBadge } from "./components/CreditBadge";
import { NoCreditsModal } from "./components/NoCreditsModal";
import { BlacklistManager } from "./components/BlacklistManager";
import { MetricsCards } from "./components/MetricsCards";
import { RequestLeadsModal } from "./components/RequestLeadsModal";
import { AgibankLead, AgibankLeadStatus, STATUS_ORDER, normalizePhone } from "./types";

export function AgibankLeadsModule() {
  const { user, profile } = useAuth();
  const isAdmin = (profile as any)?.role === "admin";
  const { leads, isLoading, agentsById, fetchLeads, updateLeadStatus, updateNotes, reassignAgent, consumeCredit } = useAgibankLeads();
  const { balance } = useAgibankCredits();

  const [activeFilter, setActiveFilter] = useState<AgibankLeadStatus | "todos">("todos");
  const [selected, setSelected] = useState<AgibankLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [showNoCredits, setShowNoCredits] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  const [waLead, setWaLead] = useState<AgibankLead | null>(null);
  const [waMessage, setWaMessage] = useState("");
  const [waSending, setWaSending] = useState(false);

  // Gestor check (frontend best-effort; backend enforces RLS)
  const canManage = isAdmin || (profile as any)?.is_gestor === true;

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: leads.length };
    STATUS_ORDER.forEach(s => { c[s] = 0; });
    leads.forEach(l => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [leads]);

  const filtered = useMemo(() => {
    if (activeFilter === "todos") return leads;
    return leads.filter(l => l.status === activeFilter);
  }, [leads, activeFilter]);

  const handleOpen = async (lead: AgibankLead) => {
    // Try to consume credit (no-op for admin/gestor or already opened)
    const result = await consumeCredit(lead.id);
    if (!result.success) {
      if (result.error === "insufficient_credits") {
        setShowNoCredits(true);
        return;
      }
      toast.error(result.error || "Erro ao abrir lead");
      return;
    }
    // Re-fetch the lead from state (may have first_opened_at updated)
    const fresh = leads.find(l => l.id === lead.id) || lead;
    setSelected(fresh);
    setDrawerOpen(true);
  };

  const handleApiWhatsApp = (lead: AgibankLead) => {
    setWaLead(lead);
    setWaMessage(`Olá ${lead.name.split(" ")[0]}, tudo bem?`);
  };

  const sendApiWhatsApp = async () => {
    if (!waLead || !waMessage.trim()) return;
    setWaSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          number: normalizePhone(waLead.phone),
          message: waMessage,
          clientName: waLead.name,
          sourceModule: "leads-agibank",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Mensagem enviada via API");
      setWaLead(null);
    } catch (e: any) {
      toast.error("Erro ao enviar", { description: e.message });
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leads Agibank</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads no total</p>
        </div>
        <div className="flex items-center gap-2">
          <CreditBadge balance={balance} />
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-1" /> Importar
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowBlacklist(true)}>
              <Shield className="h-4 w-4 mr-1" /> Blacklist
            </Button>
          )}
        </div>
      </div>

      <MetricsCards leads={leads} creditsBalance={balance} />

      <FilterTabs active={activeFilter} onChange={setActiveFilter} counts={counts} />

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Nenhum lead nesse filtro.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            agentName={lead.agent_id ? agentsById[lead.agent_id]?.name || agentsById[lead.agent_id]?.email : null}
            onOpen={handleOpen}
            onApiWhatsApp={handleApiWhatsApp}
          />
        ))}
      </div>

      <LeadDrawer
        lead={selected}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setTimeout(() => setSelected(null), 200); }}
        onStatusChange={updateLeadStatus}
        onSaveNotes={updateNotes}
        onApiWhatsApp={handleApiWhatsApp}
        canReassign={canManage}
        onReassign={reassignAgent}
        agents={Object.entries(agentsById).map(([id, v]) => ({ id, ...v }))}
        agentName={selected?.agent_id ? agentsById[selected.agent_id]?.name : null}
      />

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImported={fetchLeads} />
      <BlacklistManager open={showBlacklist} onClose={() => setShowBlacklist(false)} canDelete={isAdmin} />
      <NoCreditsModal open={showNoCredits} onClose={() => setShowNoCredits(false)} />

      <Dialog open={!!waLead} onOpenChange={(v) => !v && setWaLead(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar via API WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Para: {waLead?.name}</Label>
            <Textarea value={waMessage} onChange={(e) => setWaMessage(e.target.value)} rows={5} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaLead(null)} disabled={waSending}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={sendApiWhatsApp} disabled={waSending}>
              {waSending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
