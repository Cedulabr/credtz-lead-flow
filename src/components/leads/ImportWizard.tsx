import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, FileSpreadsheet, ChevronLeft, ChevronRight, ChevronDown, Download, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OptionCard } from "./wizard/OptionCard";
import {
  Convenio, Subtipo, FIELDS_BY_CONVENIO, ESTADOS_BR, CONVENIO_LABELS, SUBTIPO_LABELS,
  autoMapHeaders,
} from "./wizard/columnsConfig";
import { downloadTemplate, downloadSkippedReport, parseFile } from "./wizard/xlsxTemplate";
import { cn } from "@/lib/utils";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

type StepId = 'convenio' | 'subtipo' | 'estado' | 'upload' | 'mapping' | 'confirm';

export function ImportWizard({ open, onOpenChange, onCompleted }: ImportWizardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [subtipo, setSubtipo] = useState<Subtipo | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [estadoOpen, setEstadoOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showColumns, setShowColumns] = useState(false);

  const fields = convenio ? FIELDS_BY_CONVENIO[convenio] : [];

  // Calcula passos dinâmicos
  const steps: StepId[] = (() => {
    const s: StepId[] = ['convenio'];
    if (convenio === 'SERVIDOR_PUBLICO') s.push('subtipo');
    if (convenio === 'SERVIDOR_PUBLICO' && (subtipo === 'estadual' || subtipo === 'municipal')) s.push('estado');
    s.push('upload', 'mapping', 'confirm');
    return s;
  })();
  const currentStep = steps[stepIdx];

  const reset = () => {
    setConvenio(null); setSubtipo(null); setEstado(null);
    setFile(null); setParsed(null); setMapping({});
    setStepIdx(0); setSubmitting(false); setProgress(0); setResult(null);
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  const handleFile = async (f: File) => {
    setFile(f);
    try {
      const p = await parseFile(f);
      setParsed(p);
      setMapping(autoMapHeaders(fields, p.headers));
    } catch (e: any) {
      toast({ title: 'Erro ao ler arquivo', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  const canProceed = (() => {
    if (currentStep === 'convenio') return !!convenio;
    if (currentStep === 'subtipo') return !!subtipo;
    if (currentStep === 'estado') return !!estado;
    if (currentStep === 'upload') return !!parsed && parsed.rows.length > 0;
    if (currentStep === 'mapping') return fields.filter(f => f.required).every(f => !!mapping[f.key]);
    return true;
  })();

  const next = () => { if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1); };
  const back = () => { if (stepIdx > 0) setStepIdx(stepIdx - 1); };

  const submit = async () => {
    if (!parsed || !convenio) return;
    setSubmitting(true); setProgress(10);
    try {
      const { data, error } = await supabase.functions.invoke('import-leads', {
        body: {
          convenio,
          subtipo,
          estado,
          mapping,
          rows: parsed.rows,
          file_name: file?.name,
          file_size_bytes: file?.size,
        },
      });
      setProgress(100);
      if (error) throw error;
      setResult(data);
      onCompleted?.();
    } catch (e: any) {
      toast({ title: 'Falha na importação', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Base de Leads</DialogTitle>
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
              )}>
                {i < stepIdx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={cn("flex-1 h-0.5 mx-1", i < stepIdx ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        <div className="min-h-[280px] py-2">
          {result ? (
            <ResultScreen result={result} onClose={() => onOpenChange(false)} />
          ) : currentStep === 'convenio' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Qual tipo de lead você quer importar?</h3>
              <OptionCard icon="💛" title="INSS" description="Aposentados e pensionistas INSS" selected={convenio === 'INSS'} onClick={() => { setConvenio('INSS'); setSubtipo(null); setEstado(null); }} />
              <OptionCard icon="🔵" title="SIAPE" description="Servidores federais (folha federal)" selected={convenio === 'SIAPE'} onClick={() => { setConvenio('SIAPE'); setSubtipo(null); setEstado(null); }} />
              <OptionCard icon="🏛️" title="Servidor Público" description="Estadual e municipal" selected={convenio === 'SERVIDOR_PUBLICO'} onClick={() => setConvenio('SERVIDOR_PUBLICO')} />
            </div>
          ) : currentStep === 'subtipo' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Qual vínculo do servidor?</h3>
              <OptionCard icon="🏛️" title="Federal" description="Órgãos e autarquias federais" selected={subtipo === 'federal'} onClick={() => { setSubtipo('federal'); setEstado(null); }} />
              <OptionCard icon="🏢" title="Estadual" description="Servidores de governo estadual" selected={subtipo === 'estadual'} onClick={() => setSubtipo('estadual')} />
              <OptionCard icon="🏙️" title="Municipal" description="Prefeituras e câmaras municipais" selected={subtipo === 'municipal'} onClick={() => setSubtipo('municipal')} />
            </div>
          ) : currentStep === 'estado' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Selecione o estado</h3>
              <Popover open={estadoOpen} onOpenChange={setEstadoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {estado ?? 'Escolha um estado...'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar estado..." />
                    <CommandList>
                      <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                      <CommandGroup>
                        {ESTADOS_BR.map((uf) => (
                          <CommandItem key={uf} value={uf} onSelect={() => { setEstado(uf); setEstadoOpen(false); }}>
                            {uf}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : currentStep === 'upload' ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Anexe o arquivo de importação</h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="font-medium">{file.name}</span>
                    <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setFile(null); setParsed(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">Arraste e solte ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">.csv ou .xlsx</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              <Collapsible open={showColumns} onOpenChange={setShowColumns}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className={cn("h-4 w-4 mr-1 transition-transform", showColumns && "rotate-180")} />
                      Ver colunas esperadas
                    </Button>
                  </CollapsibleTrigger>
                  <Button variant="outline" size="sm" onClick={() => downloadTemplate(`modelo-${convenio?.toLowerCase()}.xlsx`, fields)}>
                    <Download className="h-4 w-4 mr-1" /> Baixar modelo .xlsx
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="border rounded-md mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Coluna</TableHead>
                          <TableHead className="w-24 text-right">Obrigatória</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map(f => (
                          <TableRow key={f.key}>
                            <TableCell>{f.label}</TableCell>
                            <TableCell className="text-right">{f.required ? '✅' : '⬜'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {convenio === 'SERVIDOR_PUBLICO' && (
                    <p className="text-xs text-muted-foreground mt-2">Telefone e DDD são opcionais na importação e podem ser adicionados posteriormente via Atualizar Dados.</p>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {parsed && parsed.rows.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Pré-visualização ({parsed.rows.length} linhas detectadas)</p>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>{parsed.headers.slice(0, 8).map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsed.rows.slice(0, 5).map((r, i) => (
                          <TableRow key={i}>
                            {parsed.headers.slice(0, 8).map(h => <TableCell key={h} className="text-xs">{String(r[h] ?? '').substring(0, 30)}</TableCell>)}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : currentStep === 'mapping' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Mapeie as colunas do seu arquivo</h3>
              <p className="text-sm text-muted-foreground">Campos obrigatórios não mapeados aparecem em vermelho.</p>
              <div className="grid grid-cols-1 gap-2">
                {fields.map(f => {
                  const missing = f.required && !mapping[f.key];
                  return (
                    <div key={f.key} className={cn("grid grid-cols-2 gap-2 items-center p-2 rounded-md border", missing && "border-destructive bg-destructive/5")}>
                      <div className="text-sm font-medium flex items-center gap-1">
                        {f.label} {f.required && <span className="text-destructive">*</span>}
                      </div>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={mapping[f.key] ?? ''}
                        onChange={(e) => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                      >
                        <option value="">— não mapear —</option>
                        {parsed?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentStep === 'confirm' ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Confirme e inicie a importação</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Convênio:</span> <Badge variant="secondary">{CONVENIO_LABELS[convenio!]}</Badge></div>
                {subtipo && <div><span className="text-muted-foreground">Vínculo:</span> <Badge variant="secondary">{SUBTIPO_LABELS[subtipo]}</Badge></div>}
                {estado && <div><span className="text-muted-foreground">Estado:</span> <Badge variant="secondary">{estado}</Badge></div>}
                <div><span className="text-muted-foreground">Linhas detectadas:</span> <strong>{parsed?.rows.length}</strong></div>
                <div><span className="text-muted-foreground">Colunas mapeadas:</span> <strong>{Object.values(mapping).filter(Boolean).length}/{fields.filter(f => f.required).length} obrigatórias</strong></div>
              </div>
              {submitting && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground text-center">Processando importação...</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {!result && (
          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button variant="outline" onClick={back} disabled={stepIdx === 0 || submitting}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            {currentStep === 'confirm' ? (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Iniciar Importação
              </Button>
            ) : (
              <Button onClick={next} disabled={!canProceed}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultScreen({ result, onClose }: { result: any; onClose: () => void }) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h3 className="text-lg font-semibold mt-2">Importação concluída</h3>
      </div>
      <div className="space-y-2 text-sm bg-muted/30 rounded-md p-4">
        <div>✅ <strong>{result.imported ?? 0}</strong> contratos importados com sucesso</div>
        <div>⏭️ <strong>{result.duplicates ?? 0}</strong> contratos ignorados (já existem — mesmo CPF, banco e parcela)</div>
        <div>👤 <strong>{result.cpfs_unique_added ?? 0}</strong> CPFs únicos adicionados</div>
        <div>👤 <strong>{result.cpfs_existing_with_new_contract ?? 0}</strong> CPFs já existentes — novos contratos vinculados</div>
        {result.invalid > 0 && <div>⚠️ <strong>{result.invalid}</strong> linhas inválidas</div>}
      </div>
      {(result.invalid > 0 || result.duplicates > 0) && result.skipped_sample?.length > 0 && (
        <Button variant="outline" className="w-full" onClick={() => downloadSkippedReport('ignorados.xlsx', result.skipped_sample)}>
          <Download className="h-4 w-4 mr-1" /> Baixar relatório de ignorados (.xlsx)
        </Button>
      )}
      <Button className="w-full" onClick={onClose}>Fechar</Button>
    </div>
  );
}
