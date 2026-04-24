import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Download, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UPDATE_GROUPS, UpdateGroup, autoMapHeaders, normalizeCpf, FieldDef } from "./wizard/columnsConfig";
import { downloadTemplate, downloadSkippedReport, parseFile } from "./wizard/xlsxTemplate";
import { cn } from "@/lib/utils";

interface UpdateDataWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

type Strategy = 'all' | 'latest' | 'manual';
type StepId = 'select' | 'upload' | 'mapping' | 'preview';

export function UpdateDataWizard({ open, onOpenChange, onCompleted }: UpdateDataWizardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<UpdateGroup>>(new Set());
  const [strategy, setStrategy] = useState<Strategy>('all');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewStats, setPreviewStats] = useState<{ found: number; foundUnique: number; foundMulti: number; notFound: number } | null>(null);

  const steps: StepId[] = ['select', 'upload', 'mapping', 'preview'];
  const currentStep = steps[stepIdx];

  // Constrói lista de campos exigidos a partir dos grupos selecionados (CPF sempre + união dos campos)
  const requiredFields: FieldDef[] = (() => {
    const cpf: FieldDef = { key: 'cpf', label: 'CPF', required: true };
    const seen = new Set<string>();
    const out: FieldDef[] = [cpf]; seen.add('cpf');
    for (const g of UPDATE_GROUPS) {
      if (selected.has(g.id)) {
        for (const f of g.fields) if (!seen.has(f.key)) { out.push(f); seen.add(f.key); }
      }
    }
    return out;
  })();

  const reset = () => {
    setSelected(new Set()); setStrategy('all'); setFile(null); setParsed(null);
    setMapping({}); setStepIdx(0); setSubmitting(false); setResult(null); setPreviewStats(null);
  };
  useEffect(() => { if (!open) reset(); }, [open]);

  const handleFile = async (f: File) => {
    setFile(f);
    try {
      const p = await parseFile(f);
      setParsed(p);
      setMapping(autoMapHeaders(requiredFields, p.headers));
    } catch (e: any) {
      toast({ title: 'Erro ao ler arquivo', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const toggleGroup = (id: UpdateGroup) => {
    setSelected(s => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  };

  const canProceed = (() => {
    if (currentStep === 'select') return selected.size > 0;
    if (currentStep === 'upload') return !!parsed && parsed.rows.length > 0;
    if (currentStep === 'mapping') return requiredFields.filter(f => f.required).every(f => !!mapping[f.key]);
    return true;
  })();

  // Preview: consulta CPFs no banco
  const loadPreview = async () => {
    if (!parsed) return;
    const cpfs = Array.from(new Set(parsed.rows.map(r => normalizeCpf(r[mapping['cpf']])).filter(Boolean) as string[]));
    const counts = new Map<string, number>();
    for (let i = 0; i < cpfs.length; i += 500) {
      const chunk = cpfs.slice(i, i + 500);
      const { data } = await supabase.from('leads_database').select('cpf').in('cpf', chunk);
      for (const r of data ?? []) counts.set(r.cpf, (counts.get(r.cpf) ?? 0) + 1);
    }
    const foundUnique = Array.from(counts.values()).filter(n => n === 1).length;
    const foundMulti = Array.from(counts.values()).filter(n => n > 1).length;
    const found = foundUnique + foundMulti;
    setPreviewStats({ found, foundUnique, foundMulti, notFound: cpfs.length - found });
  };

  useEffect(() => { if (currentStep === 'preview') loadPreview(); }, [currentStep]);

  const next = () => { if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1); };
  const back = () => { if (stepIdx > 0) setStepIdx(stepIdx - 1); };

  const submit = async () => {
    if (!parsed) return;
    setSubmitting(true);
    try {
      const fields = requiredFields.filter(f => f.key !== 'cpf').map(f => f.key);
      const { data, error } = await supabase.functions.invoke('update-leads-data', {
        body: { fields, mapping, rows: parsed.rows, strategy, file_name: file?.name },
      });
      if (error) throw error;
      setResult(data);
      onCompleted?.();
    } catch (e: any) {
      toast({ title: 'Falha na atualização', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const notFoundPct = previewStats && previewStats.found + previewStats.notFound > 0
    ? (previewStats.notFound / (previewStats.found + previewStats.notFound)) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atualizar Dados</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-1 py-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2",
                i < stepIdx && "bg-primary text-primary-foreground border-primary",
                i === stepIdx && "bg-background text-primary border-primary",
                i > stepIdx && "bg-background text-muted-foreground border-muted",
              )}>{i < stepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</div>
              {i < steps.length - 1 && <div className={cn("flex-1 h-0.5 mx-1", i < stepIdx ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        <div className="min-h-[300px] py-2">
          {result ? (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
                <h3 className="text-lg font-semibold mt-2">Atualização concluída</h3>
              </div>
              <div className="space-y-2 text-sm bg-muted/30 rounded-md p-4">
                <div>✅ <strong>{result.updated ?? 0}</strong> registros atualizados</div>
                <div>⏭️ <strong>{result.not_found ?? 0}</strong> CPFs não encontrados (ignorados)</div>
                {result.invalid > 0 && <div>⚠️ <strong>{result.invalid}</strong> linhas inválidas</div>}
              </div>
              {result.skipped_sample?.length > 0 && (
                <Button variant="outline" className="w-full" onClick={() => downloadSkippedReport('ignorados-update.xlsx', result.skipped_sample)}>
                  <Download className="h-4 w-4 mr-1" /> Baixar relatório de ignorados (.xlsx)
                </Button>
              )}
              <Button className="w-full" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          ) : currentStep === 'select' ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">O que você quer atualizar?</h3>
                <p className="text-sm text-muted-foreground">Selecione um ou mais campos para atualizar via arquivo</p>
              </div>
              <div className="space-y-2">
                {UPDATE_GROUPS.map(g => (
                  <label key={g.id} className={cn(
                    "flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer transition-all",
                    selected.has(g.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}>
                    <Checkbox checked={selected.has(g.id)} onCheckedChange={() => toggleGroup(g.id)} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2"><span>{g.icon}</span>{g.label}</div>
                      <p className="text-xs text-muted-foreground">{g.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2">
                <Label className="text-sm font-medium">Quando o CPF tiver múltiplos contratos:</Label>
                <RadioGroup value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                  <div className="flex items-center gap-2"><RadioGroupItem value="all" id="s-all" /><Label htmlFor="s-all" className="font-normal">Atualizar todos os contratos do CPF</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="latest" id="s-latest" /><Label htmlFor="s-latest" className="font-normal">Atualizar apenas o contrato mais recente</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="manual" id="s-manual" disabled /><Label htmlFor="s-manual" className="font-normal text-muted-foreground">Deixar o usuário escolher (em breve)</Label></div>
                </RadioGroup>
              </div>
            </div>
          ) : currentStep === 'upload' ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Anexe o arquivo</h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50"
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /><span className="font-medium">{file.name}</span>
                    <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setFile(null); setParsed(null); }}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <><p className="font-medium">Arraste e solte ou clique para selecionar</p><p className="text-xs text-muted-foreground mt-1">.csv ou .xlsx</p></>
                )}
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Colunas necessárias: <strong>{requiredFields.map(f => f.label).join(', ')}</strong></p>
                <Button variant="outline" size="sm" onClick={() => downloadTemplate('modelo-atualizacao.xlsx', requiredFields)}>
                  <Download className="h-4 w-4 mr-1" /> Modelo .xlsx
                </Button>
              </div>
            </div>
          ) : currentStep === 'mapping' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Mapeie as colunas</h3>
              <div className="grid grid-cols-1 gap-2">
                {requiredFields.map(f => {
                  const missing = f.required && !mapping[f.key];
                  return (
                    <div key={f.key} className={cn("grid grid-cols-2 gap-2 items-center p-2 rounded-md border", missing && "border-destructive bg-destructive/5")}>
                      <div className="text-sm font-medium">{f.label} {f.required && <span className="text-destructive">*</span>}</div>
                      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={mapping[f.key] ?? ''} onChange={(e) => setMapping(m => ({ ...m, [f.key]: e.target.value }))}>
                        <option value="">— não mapear —</option>
                        {parsed?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentStep === 'preview' ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Pré-visualização</h3>
              <div className="text-sm space-y-1 bg-muted/30 rounded-md p-4">
                <div><strong>Campos a atualizar:</strong> {requiredFields.filter(f => f.key !== 'cpf').map(f => f.label).join(', ')}</div>
                <div><strong>Linhas no arquivo:</strong> {parsed?.rows.length}</div>
                {previewStats ? (
                  <>
                    <div>CPFs encontrados: <strong>{previewStats.found}</strong></div>
                    <div className="pl-4">→ Com contrato único: <strong>{previewStats.foundUnique}</strong></div>
                    <div className="pl-4">→ Com múltiplos contratos: <strong>{previewStats.foundMulti}</strong> (regra: {strategy === 'all' ? 'todos' : 'mais recente'})</div>
                    <div>CPFs não encontrados: <strong>{previewStats.notFound}</strong> (serão ignorados)</div>
                  </>
                ) : <div className="text-muted-foreground">Carregando preview...</div>}
              </div>
              {notFoundPct > 20 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {notFoundPct.toFixed(0)}% dos CPFs do arquivo não foram encontrados na base. Verifique se o arquivo está correto antes de continuar.
                  </AlertDescription>
                </Alert>
              )}
              {submitting && <Progress value={50} />}
            </div>
          ) : null}
        </div>

        {!result && (
          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button variant="outline" onClick={back} disabled={stepIdx === 0 || submitting}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            {currentStep === 'preview' ? (
              <Button onClick={submit} disabled={submitting || !previewStats}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Confirmar Atualização
              </Button>
            ) : (
              <Button onClick={next} disabled={!canProceed}>Próximo <ChevronRight className="h-4 w-4 ml-1" /></Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
