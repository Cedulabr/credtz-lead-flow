import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle, RefreshCw, FileX } from "lucide-react";

interface DuplicateGroup {
  cpf: string;
  matricula: string;
  banco: string;
  ade: string;
  name: string;
  keep_id: string;
  remove_ids: string[];
  total: number;
}

interface ImportLogRow {
  id: string;
  file_name: string;
  created_at: string;
  success_count: number;
  duplicate_count: number;
  total_records: number;
}

export function LeadsBulkActions({ onChanged }: { onChanged: () => void }) {
  const { toast } = useToast();
  const [scanOpen, setScanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // scan
  const [isScanning, setIsScanning] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [isMerging, setIsMerging] = useState(false);

  // delete
  const [logs, setLogs] = useState<ImportLogRow[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string>("");
  const [deleteDate, setDeleteDate] = useState<string>("");
  const [deleteOrigem, setDeleteOrigem] = useState<string>("all");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (deleteOpen) loadLogs();
  }, [deleteOpen]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('import_logs')
      .select('id, file_name, created_at, success_count, duplicate_count, total_records')
      .eq('module', 'leads_database')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs(data || []);
  };

  const runScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.rpc('scan_duplicates_leads_database' as any);
      if (error) throw error;
      const r: any = data || {};
      setGroups(r.groups || []);
      setTotalDuplicates(r.total_duplicates || 0);
      toast({ title: "Varredura concluída", description: `${r.total_groups || 0} grupos com ${r.total_duplicates || 0} duplicatas` });
    } catch (e: any) {
      toast({ title: "Erro na varredura", description: e.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const mergeAll = async () => {
    if (groups.length === 0) return;
    setIsMerging(true);
    try {
      const allIds = groups.flatMap(g => g.remove_ids);
      const { error } = await supabase.rpc('merge_duplicates_leads_database' as any, { remove_ids: allIds });
      if (error) throw error;
      toast({ title: "Duplicatas removidas", description: `${allIds.length} leads duplicados foram apagados` });
      setGroups([]);
      setTotalDuplicates(0);
      onChanged();
    } catch (e: any) {
      toast({ title: "Erro ao mesclar", description: e.message, variant: "destructive" });
    } finally {
      setIsMerging(false);
    }
  };

  const deleteByLog = async () => {
    if (!selectedLogId || confirmText !== 'APAGAR') return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.rpc('delete_leads_by_import_log' as any, { p_log_id: selectedLogId });
      if (error) throw error;
      const d: any = data || {};
      toast({ title: "Importação apagada", description: `${d.deleted || 0} leads removidos` });
      setSelectedLogId("");
      setConfirmText("");
      setDeleteOpen(false);
      onChanged();
    } catch (e: any) {
      toast({ title: "Erro ao apagar", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteByDate = async () => {
    if (!deleteDate || confirmText !== 'APAGAR') return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.rpc('delete_leads_by_date' as any, {
        p_date: deleteDate,
        p_origem: deleteOrigem === 'all' ? null : deleteOrigem,
      });
      if (error) throw error;
      const d: any = data || {};
      toast({ title: "Leads apagados", description: `${d.deleted || 0} leads removidos da data ${deleteDate}` });
      setDeleteDate("");
      setConfirmText("");
      setDeleteOpen(false);
      onChanged();
    } catch (e: any) {
      toast({ title: "Erro ao apagar", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setScanOpen(true); setGroups([]); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Varredura de duplicatas
        </Button>
        <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
          <FileX className="h-4 w-4 mr-2" />
          Apagar importação…
        </Button>
      </div>

      {/* Scan dialog */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Varredura de duplicatas</DialogTitle>
            <DialogDescription>
              Encontra leads com mesmo CPF + matrícula + banco + ADE. O lead mais antigo é mantido.
            </DialogDescription>
          </DialogHeader>

          {groups.length === 0 ? (
            <div className="py-8 text-center">
              <Button onClick={runScan} disabled={isScanning}>
                {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Iniciar varredura
              </Button>
            </div>
          ) : (
            <>
              <Alert>
                <AlertTitle>{groups.length} grupos · {totalDuplicates} duplicatas</AlertTitle>
                <AlertDescription>Confira a lista abaixo. "Mesclar tudo" mantém o mais antigo de cada grupo e apaga os demais.</AlertDescription>
              </Alert>
              <ScrollArea className="h-[320px] border rounded-md">
                <div className="p-2 space-y-1 text-xs">
                  {groups.slice(0, 200).map((g, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{g.name}</div>
                        <div className="text-muted-foreground">CPF {g.cpf} · {g.banco || 'sem banco'} · ADE {g.ade || '-'}</div>
                      </div>
                      <Badge variant="destructive">{g.total} cópias</Badge>
                    </div>
                  ))}
                  {groups.length > 200 && (
                    <p className="text-center text-muted-foreground p-2">+ {groups.length - 200} grupos não mostrados</p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setScanOpen(false)}>Fechar</Button>
            {groups.length > 0 && (
              <Button variant="destructive" onClick={mergeAll} disabled={isMerging}>
                {isMerging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Mesclar tudo ({totalDuplicates})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setConfirmText(""); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Apagar importação em lote
            </DialogTitle>
            <DialogDescription>
              Remove definitivamente leads importados. Para confirmar, digite <strong>APAGAR</strong> no campo abaixo.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="log">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="log">Por importação</TabsTrigger>
              <TabsTrigger value="date">Por data</TabsTrigger>
            </TabsList>

            <TabsContent value="log" className="space-y-3 pt-3">
              <Label>Selecione a importação</Label>
              <Select value={selectedLogId} onValueChange={setSelectedLogId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um log de importação" />
                </SelectTrigger>
                <SelectContent>
                  {logs.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {new Date(l.created_at).toLocaleDateString('pt-BR')} · {l.file_name} · {l.success_count} novos / {l.duplicate_count} atualizados
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="date" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={deleteDate} onChange={(e) => setDeleteDate(e.target.value)} />
                </div>
                <div>
                  <Label>Origem</Label>
                  <Select value={deleteOrigem} onValueChange={setDeleteOrigem}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="governo_ba">Governo BA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Digite "APAGAR" para confirmar</Label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="APAGAR" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedLogId) deleteByLog();
                else if (deleteDate) deleteByDate();
              }}
              disabled={isDeleting || confirmText !== 'APAGAR' || (!selectedLogId && !deleteDate)}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Apagar lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
