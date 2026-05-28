import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAgibankImport, parseFile, ParsedRow } from "../hooks/useAgibankImport";
import { toast } from "sonner";

interface Props { open: boolean; onClose: () => void; onImported?: () => void; }

export function ImportModal({ open, onClose, onImported }: Props) {
  const { user, profile } = useAuth();
  const isAdmin = (profile as any)?.role === "admin";
  const { isImporting, importLeads } = useAgibankImport();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string | null; email: string | null }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"pool" | "round_robin" | "manual">("pool");
  const [manualAgent, setManualAgent] = useState<string>("");

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      let companyIds: string[] = [];
      if (!isAdmin) {
        const { data: uc } = await supabase
          .from("user_companies").select("company_id").eq("user_id", user.id).eq("is_active", true);
        companyIds = (uc || []).map(r => r.company_id);
      }
      let userIds: string[] = [];
      if (companyIds.length > 0) {
        const { data: members } = await supabase
          .from("user_companies").select("user_id").in("company_id", companyIds).eq("is_active", true);
        userIds = Array.from(new Set((members || []).map(m => m.user_id)));
      }
      let query = supabase.from("profiles").select("id, name, email, is_active").eq("is_active", true);
      if (userIds.length > 0) query = query.in("id", userIds);
      const { data: profs } = await query.limit(500);
      setAgents((profs || []) as any);
    })();
  }, [open, user, isAdmin]);

  const handleFile = async (f: File) => {
    setFile(f);
    try {
      const rows = await parseFile(f);
      setParsed(rows);
      toast.info(`${rows.length} linhas detectadas`);
    } catch (e: any) {
      toast.error("Erro ao ler arquivo", { description: e.message });
    }
  };

  const toggleAgent = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (parsed.length === 0) { toast.error("Selecione um arquivo"); return; }
    let agent_ids: string[] = [];
    if (mode !== "pool") {
      agent_ids = mode === "manual" ? (manualAgent ? [manualAgent] : []) : selected;
      if (agent_ids.length === 0) { toast.error("Selecione ao menos um agente"); return; }
    }

    const res = await importLeads({
      rows: parsed,
      file_name: file?.name || "import.csv",
      agent_ids,
      assignment_mode: mode,
    });
    if (res) {
      setFile(null); setParsed([]); setSelected([]); setManualAgent("");
      onImported?.();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Importar Leads Agibank</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Arquivo CSV ou XLSX</Label>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> {file.name} — {parsed.length} linhas válidas
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Colunas aceitas: NOME, TELEFONE1, TELEFONE2-5 (opcionais), TAG (opcional), CPF (opcional)</p>
          </div>

          <div>
            <Label>Modo de atribuição</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round_robin">Round-robin (distribuir entre vários agentes)</SelectItem>
                <SelectItem value="manual">Manual (todos para um agente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "manual" ? (
            <div>
              <Label>Agente</Label>
              <Select value={manualAgent} onValueChange={setManualAgent}>
                <SelectTrigger><SelectValue placeholder="Selecione um agente" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name || a.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Agentes (round-robin entre selecionados)</Label>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                {agents.map(a => (
                  <label key={a.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-muted/50 px-1 rounded">
                    <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleAgent(a.id)} />
                    <span>{a.name || a.email}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selected.length} selecionados</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isImporting || parsed.length === 0}>
            {isImporting ? "Importando..." : `Importar ${parsed.length} leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
