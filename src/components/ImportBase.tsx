import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ImportHistory } from "@/components/ImportHistory";
import { LeadsDatabase } from "@/components/LeadsDatabase";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  FileText,
  Loader2,
  ArrowLeft,
  Database,
  Users,
  Trash2
} from "lucide-react";

interface ParsedLead {
  nome: string;
  convenio: string;
  telefone: string;
  telefone2?: string;
  cpf?: string;
  tag?: string;
  valid: boolean;
  error?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  invalid: number;
  duplicate_details: Array<{
    nome: string;
    telefone: string;
    convenio: string;
    motivo: string;
  }>;
}

interface ImportBaseProps {
  onBack: () => void;
}

export function ImportBase({ onBack }: ImportBaseProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    await parseCSV(selectedFile);
  };

  const parseCSV = async (csvFile: File) => {
    setIsParsing(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo CSV não contém dados para importar",
          variant: "destructive",
        });
        setIsParsing(false);
        return;
      }

      // Parse header to find column indexes
      const headerLine = lines[0].toLowerCase();
      const headers = parseCSVLine(headerLine);
      
      const nomeIndex = headers.findIndex(h => h.includes('nome'));
      const convenioIndex = headers.findIndex(h => h.includes('convenio') || h.includes('convênio'));
      const telefoneIndex = headers.findIndex(h => h.includes('telefone 1') || h.includes('telefone1') || (h.includes('telefone') && !h.includes('2')));
      const telefone2Index = headers.findIndex(h => h.includes('telefone 2') || h.includes('telefone2'));
      const cpfIndex = headers.findIndex(h => h.includes('cpf'));
      const tagIndex = headers.findIndex(h => h.includes('tag') || h.includes('perfil') || h.includes('classificação') || h.includes('classificacao'));

      if (nomeIndex === -1 || convenioIndex === -1 || telefoneIndex === -1) {
        toast({
          title: "Colunas obrigatórias não encontradas",
          description: "O arquivo deve conter as colunas: Nome, Convênio, Telefone 1 (Telefone 2, CPF e Tag são opcionais)",
          variant: "destructive",
        });
        setIsParsing(false);
        return;
      }

      const leads: ParsedLead[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        const nome = values[nomeIndex]?.trim() || '';
        const convenio = values[convenioIndex]?.trim() || '';
        const telefone = values[telefoneIndex]?.replace(/\D/g, '') || '';
        const telefone2 = telefone2Index !== -1 ? values[telefone2Index]?.replace(/\D/g, '') || '' : '';
        const cpf = cpfIndex !== -1 ? values[cpfIndex]?.replace(/\D/g, '') || '' : '';
        const tag = tagIndex !== -1 ? values[tagIndex]?.trim() || '' : '';

        let valid = true;
        let error = '';

        if (!nome) {
          valid = false;
          error = 'Nome vazio';
        } else if (!convenio) {
          valid = false;
          error = 'Convênio vazio';
        } else if (!telefone || telefone.length < 10) {
          valid = false;
          error = 'Telefone 1 inválido';
        } else if (telefone2 && telefone2.length < 10) {
          valid = false;
          error = 'Telefone 2 inválido';
        }

        leads.push({ nome, convenio, telefone, telefone2: telefone2 || undefined, cpf: cpf || undefined, tag: tag || undefined, valid, error });
      }

      setParsedLeads(leads);
      setShowPreview(true);
      
      const validCount = leads.filter(l => l.valid).length;
      const invalidCount = leads.filter(l => !l.valid).length;
      
      toast({
        title: "Arquivo processado",
        description: `${validCount} leads válidos, ${invalidCount} com erros`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Não foi possível ler o arquivo CSV",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const handleImport = async () => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem importar leads",
        variant: "destructive",
      });
      return;
    }

    const validLeads = parsedLeads.filter(l => l.valid);
    
    if (validLeads.length === 0) {
      toast({
        title: "Nenhum lead válido",
        description: "Não há leads válidos para importar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
    const leadsData = validLeads.map(lead => ({
        nome: lead.nome,
        cpf: lead.cpf || '',
        convenio: lead.convenio,
        telefone: lead.telefone,
        telefone2: lead.telefone2 || null,
        tag: lead.tag || null
      }));

      const { data, error } = await supabase.rpc('import_leads_from_csv', {
        leads_data: leadsData
      });

      if (error) throw error;

      const result = data as unknown as ImportResult;
      setImportResult(result);
      setShowResultDialog(true);

      // Registrar log de importação - buscar company_id correto (UUID)
      let companyId: string | null = null;
      
      // 1. Tentar buscar da tabela user_companies
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (userCompany?.company_id) {
        companyId = userCompany.company_id;
      } else if (profile?.company) {
        // 2. Fallback: buscar pelo nome da empresa
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', profile.company)
          .limit(1)
          .single();
        
        companyId = company?.id || null;
      }
      
      await supabase.from('import_logs').insert({
        module: 'leads_database',
        file_name: file?.name || 'unknown.csv',
        total_records: parsedLeads.length,
        success_count: result.imported,
        error_count: result.invalid || 0,
        duplicate_count: result.duplicates,
        status: 'completed',
        imported_by: user!.id,
        company_id: companyId,
      });

      toast({
        title: "Importação concluída",
        description: `${result.imported} leads importados, ${result.duplicates} duplicados`,
        variant: result.imported > 0 ? "default" : "destructive",
      });

      // Reset state after successful import
      if (result.imported > 0) {
        setFile(null);
        setParsedLeads([]);
        setShowPreview(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      console.error('Error importing leads:', error);
      
      // Registrar log de erro - buscar company_id correto (UUID)
      let errorCompanyId: string | null = null;
      
      const { data: userCompanyErr } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (userCompanyErr?.company_id) {
        errorCompanyId = userCompanyErr.company_id;
      } else if (profile?.company) {
        const { data: companyErr } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', profile.company)
          .limit(1)
          .single();
        
        errorCompanyId = companyErr?.id || null;
      }
      
      await supabase.from('import_logs').insert({
        module: 'leads_database',
        file_name: file?.name || 'unknown.csv',
        total_records: parsedLeads.length,
        success_count: 0,
        error_count: parsedLeads.length,
        duplicate_count: 0,
        status: 'failed',
        imported_by: user!.id,
        company_id: errorCompanyId,
        error_details: { message: error.message },
      });
      
      toast({
        title: "Erro na importação",
        description: error.message || "Não foi possível importar os leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'Nome,Telefone 1,Telefone 2,Convênio,Tag\nJoão Silva,11999998888,11988887776,INSS,Tomador\nMaria Santos,21988887777,,SIAPE,Com margem para empréstimo\nCarlos Lima,71977776666,71966665555,INSS,Redução de parcela';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_leads.csv';
    link.click();
  };


  const formatPhone = (phone: string) => {
    if (!phone) return phone;
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (phone.length === 10) {
      return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Apenas administradores podem acessar a funcionalidade de importação de leads.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const validLeads = parsedLeads.filter(l => l.valid);
  const invalidLeads = parsedLeads.filter(l => !l.valid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Leads Premium
            </h2>
            <p className="text-muted-foreground">Importe e gerencie sua base de leads</p>
          </div>
        </div>
        <ImportHistory module="leads_database" title="Leads Premium" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Users className="h-4 w-4" />
            Gerenciar Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6 mt-6">

      {/* Instructions Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Instruções de Importação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Formato do Arquivo</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Arquivo CSV (separado por vírgula ou ponto-vírgula)</li>
                <li>• Primeira linha deve conter os cabeçalhos</li>
                <li>• Codificação UTF-8 recomendada</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Colunas</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Nome</strong> - Nome completo do lead (obrigatório)</li>
                <li>• <strong>Telefone 1</strong> - 10 ou 11 dígitos (obrigatório)</li>
                <li>• <strong>Telefone 2</strong> - 10 ou 11 dígitos (opcional)</li>
                <li>• <strong>Convênio</strong> - Ex: INSS, SIAPE, etc (obrigatório)</li>
                <li>• <strong>CPF</strong> - 11 dígitos (opcional)</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      {!showPreview && (
        <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Selecione o arquivo CSV</h3>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte ou clique para selecionar
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isParsing}
                  />
                  <Button asChild disabled={isParsing}>
                    <span>
                      {isParsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Selecionar Arquivo
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {showPreview && parsedLeads.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pré-visualização da Importação</CardTitle>
                <CardDescription>
                  Arquivo: {file?.name} • {parsedLeads.length} registros encontrados
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPreview(false);
                    setFile(null);
                    setParsedLeads([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={isLoading || validLeads.length === 0}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {validLeads.length} Leads
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{parsedLeads.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="p-4 bg-success/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-success">{validLeads.length}</p>
                <p className="text-sm text-muted-foreground">Válidos</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-destructive">{invalidLeads.length}</p>
                <p className="text-sm text-muted-foreground">Com Erros</p>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Tag/Perfil</TableHead>
                    <TableHead>Telefone 1</TableHead>
                    <TableHead>Telefone 2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedLeads.slice(0, 100).map((lead, index) => (
                    <TableRow key={index} className={!lead.valid ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell>
                        {lead.valid ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Válido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            <XCircle className="h-3 w-3 mr-1" />
                            {lead.error}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{lead.nome || '-'}</TableCell>
                      <TableCell>{lead.convenio || '-'}</TableCell>
                      <TableCell>
                        {lead.tag ? (
                          <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
                            {lead.tag}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatPhone(lead.telefone) || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{lead.telefone2 ? formatPhone(lead.telefone2) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedLeads.length > 100 && (
              <p className="text-sm text-muted-foreground text-center">
                Mostrando primeiros 100 de {parsedLeads.length} registros
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult?.imported && importResult.imported > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-success" />
                  Importação Concluída
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Importação com Avisos
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Resumo da importação de leads
            </DialogDescription>
          </DialogHeader>
          
          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-success/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-success">{importResult.imported}</p>
                  <p className="text-sm text-muted-foreground">Importados</p>
                </div>
                <div className="p-4 bg-warning/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-warning">{importResult.duplicates}</p>
                  <p className="text-sm text-muted-foreground">Duplicados</p>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-destructive">{importResult.invalid}</p>
                  <p className="text-sm text-muted-foreground">Inválidos</p>
                </div>
              </div>

              {importResult.duplicate_details && importResult.duplicate_details.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Detalhes dos Duplicados:</h4>
                  <div className="max-h-[200px] overflow-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Convênio</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.duplicate_details.slice(0, 20).map((dup, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-sm">{dup.nome}</TableCell>
                            <TableCell className="text-sm">{dup.convenio}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {dup.motivo}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importResult.duplicate_details.length > 20 && (
                    <p className="text-xs text-muted-foreground">
                      + {importResult.duplicate_details.length - 20} duplicados adicionais
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <LeadsDatabase />
        </TabsContent>
      </Tabs>
    </div>
  );
}
