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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const CONVENIO_OPTIONS = [
  { value: 'INSS', label: 'INSS' },
  { value: 'SIAPE', label: 'SIAPE' },
  { value: 'GOVERNO BA', label: 'Servidor Público (Governo BA)' },
  { value: 'FGTS', label: 'FGTS' },
  { value: 'BOLSA FAMILIA', label: 'Bolsa Família' },
  { value: 'CLT', label: 'CLT' },
  { value: 'OUTRO', label: 'Outro' },
];

const normalizeCPF = (raw: any): string | null => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits || digits.length > 11) return null;
  return digits.padStart(11, '0');
};
import { ImportHistory } from "@/components/ImportHistory";
import { LeadsDatabase } from "@/components/LeadsDatabase";
import { DuplicateFileAlert } from "@/components/ui/duplicate-file-alert";
import { calculateFileHash, checkDuplicateImport, type DuplicateImportInfo } from "@/lib/fileHash";
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

  // Campos extras (Base Governo)
  matricula?: string;
  banco?: string;
  margem_disponivel?: string;
  margem_total?: string;
  situacao?: string;
  ade?: string;
  servico_servidor?: string;
  tipo_servico_servidor?: string;
  servico_consignataria?: string;
  parcela?: string;
  parcelas_em_aberto?: string;
  parcelas_pagas?: string;
  deferimento?: string;
  quitacao?: string;
  ultimo_desconto?: string;
  ultima_parcela?: string;
}

type BaseFormat = 'padrao' | 'governo';

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
  const [baseFormat, setBaseFormat] = useState<BaseFormat>('padrao');
  const [selectedConvenio, setSelectedConvenio] = useState<string>('');
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  
  // Duplicate file detection states
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateImportInfo | null>(null);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  const effectiveConvenio = baseFormat === 'governo' ? 'GOVERNO BA' : selectedConvenio;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!effectiveConvenio) {
      toast({
        title: "Selecione o convênio",
        description: "Escolha o convênio destes leads antes de selecionar o arquivo.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const extension = selectedFile.name.toLowerCase();
    if (!extension.endsWith('.csv') && !extension.endsWith('.xlsx') && !extension.endsWith('.xls')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV ou Excel (XLSX/XLS)",
        variant: "destructive",
      });
      return;
    }

    // Calculate file hash and check for duplicates
    try {
      const hash = await calculateFileHash(selectedFile);
      setFileHash(hash);
      
      const dupInfo = await checkDuplicateImport(hash, 'leads_database');
      
      if (dupInfo.isDuplicate) {
        setDuplicateInfo(dupInfo);
        setPendingFile(selectedFile);
        setShowDuplicateAlert(true);
        return;
      }
    } catch (error) {
      console.warn('Hash calculation failed, continuing without duplicate check:', error);
    }

    await processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    const extension = selectedFile.name.toLowerCase();
    if (baseFormat === 'governo') {
      await parseGovernoCSV(selectedFile);
      return;
    }
    if (extension.endsWith('.csv')) {
      await parseCSV(selectedFile);
    } else {
      await parseXLSX(selectedFile);
    }
  };

  // ===== Base Governo =====

  const decodeBytes = async (f: File): Promise<string> => {
    const buf = await f.arrayBuffer();
    const utf = new TextDecoder('utf-8').decode(buf);
    if (utf.includes('Ã') || utf.includes('Â')) {
      return new TextDecoder('windows-1252').decode(buf);
    }
    return utf;
  };

  const parseBRNumber = (raw: string): string => {
    if (!raw) return '';
    const clean = String(raw).trim().replace(/\s/g, '').replace(/R\$/gi, '');
    if (!clean) return '';
    // 1.234,56 -> 1234.56  |  1234.56 -> 1234.56
    if (clean.includes(',')) {
      return clean.replace(/\./g, '').replace(',', '.');
    }
    return clean;
  };

  const parseBRDate = (raw: string): string => {
    if (!raw) return '';
    const s = String(raw).trim();
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
    return '';
  };

  const normalizeHeader = (h: string) =>
    h.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const parseGovernoCSV = async (f: File) => {
    setIsParsing(true);
    try {
      const text = await decodeBytes(f);
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast({ title: "Arquivo vazio", description: "Sem dados para importar", variant: "destructive" });
        setIsParsing(false);
        return;
      }
      const headers = parseCSVLine(lines[0]).map(normalizeHeader);

      // Busca exata por nome normalizado, com fallbacks por substring
      const findCol = (exact: string[], contains: string[][] = []): number => {
        for (const e of exact) {
          const i = headers.indexOf(e);
          if (i !== -1) return i;
        }
        for (const needles of contains) {
          const i = headers.findIndex(h => needles.every(n => h.includes(n)));
          if (i !== -1) return i;
        }
        return -1;
      };

      const cpfI         = findCol(['cpf'], [['cpf']]);
      const nomeI        = findCol(['servidor', 'nome'], [['servidor']]);
      const matriculaI   = findCol(['matricula'], [['matricula']]);
      const tipoServI    = findCol(['tipo servico (servidor)'], [['tipo', 'servico', 'servidor']]);
      const servServI    = findCol(['servico (servidor)'], [['servico', 'servidor']]);
      const margemDispI  = findCol(['margem disponivel (r$)', 'margem disponivel'], [['margem', 'disponivel']]);
      const margemTotalI = findCol(['margem total (r$)', 'margem total'], [['margem', 'total']]);
      const bancoI       = findCol(['consignataria'], [['consignataria']]); // banco
      const situacaoI    = findCol(['situacao'], [['situacao']]);
      const adeI         = findCol(['ade'], []);
      const servConsigI  = findCol(['servico (consignataria)'], [['servico', 'consignataria']]);
      const prestI       = findCol(['prestacoes'], [['prestaco'], ['prazo']]);          // prazo original
      const pagasI       = findCol(['pagas'], [['pagas']]);                              // parcelas pagas
      const valorI       = findCol(['valor'], [['valor', 'parcela']]);                   // valor da parcela
      const deferI       = findCol(['deferimento'], [['deferimento']]);
      const quitI        = findCol(['quitacao'], [['quitacao']]);
      const ultDescI     = findCol(['ultimo desconto'], [['ultimo', 'desconto']]);
      const ultParcI     = findCol(['ultima parcela'], [['ultima', 'parcela']]);

      // Debug: log do mapeamento detectado
      console.log('[Governo CSV] Headers:', headers);
      console.log('[Governo CSV] Mapping:', {
        cpf: cpfI, nome: nomeI, matricula: matriculaI, banco: bancoI, ade: adeI,
        prestacoes: prestI, pagas: pagasI, valor: valorI,
        margemDisp: margemDispI, margemTotal: margemTotalI,
      });

      if (cpfI === -1 || nomeI === -1) {
        toast({
          title: "Cabeçalho inválido",
          description: "Esperado o formato Governo: CPF, Servidor, Matrícula, Consignatária, Valor, Margem Disponível...",
          variant: "destructive",
        });
        setIsParsing(false);
        return;
      }

      const leads: ParsedLead[] = [];
      for (let i = 1; i < lines.length; i++) {
        const v = parseCSVLine(lines[i]);
        const cpf = normalizeCPF(v[cpfI]);
        const nome = (v[nomeI] || '').trim();

        let valid = true;
        let error = '';
        if (!nome) { valid = false; error = 'Servidor vazio'; }
        else if (!cpf) { valid = false; error = 'CPF inválido'; }

        leads.push({
          nome,
          cpf: cpf || '',
          telefone: '',
          convenio: 'GOVERNO BA',
          matricula: matriculaI > -1 ? (v[matriculaI] || '').trim() : '',
          banco: bancoI > -1 ? (v[bancoI] || '').trim() : '',
          situacao: situacaoI > -1 ? (v[situacaoI] || '').trim() : '',
          ade: adeI > -1 ? (v[adeI] || '').trim() : '',
          servico_servidor: servServI > -1 ? (v[servServI] || '').trim() : '',
          tipo_servico_servidor: tipoServI > -1 ? (v[tipoServI] || '').trim() : '',
          servico_consignataria: servConsigI > -1 ? (v[servConsigI] || '').trim() : '',
          margem_disponivel: margemDispI > -1 ? parseBRNumber(v[margemDispI]) : '',
          margem_total: margemTotalI > -1 ? parseBRNumber(v[margemTotalI]) : '',
          parcela: valorI > -1 ? parseBRNumber(v[valorI]) : '',
          parcelas_em_aberto: prestI > -1 ? (v[prestI] || '').replace(/\D/g, '') : '',
          parcelas_pagas: pagasI > -1 ? (v[pagasI] || '').replace(/\D/g, '') : '',
          deferimento: deferI > -1 ? parseBRDate(v[deferI]) : '',
          quitacao: quitI > -1 ? parseBRDate(v[quitI]) : '',
          ultimo_desconto: ultDescI > -1 ? parseBRDate(v[ultDescI]) : '',
          ultima_parcela: ultParcI > -1 ? parseBRDate(v[ultParcI]) : '',
          valid,
          error,
        });
      }

      setParsedLeads(leads);
      setShowPreview(true);
      const validCount = leads.filter(l => l.valid).length;
      toast({
        title: "Arquivo Governo processado",
        description: `${validCount} registros válidos de ${leads.length}`,
      });
    } catch (e) {
      console.error('parseGovernoCSV error', e);
      toast({ title: "Erro ao processar", description: "Falha ao ler base de governo", variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDuplicateConfirm = async () => {
    setShowDuplicateAlert(false);
    if (pendingFile) {
      await processFile(pendingFile);
      setPendingFile(null);
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateAlert(false);
    setPendingFile(null);
    setDuplicateInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      const telefoneIndex = headers.findIndex(h => h.includes('telefone 1') || h.includes('telefone1') || (h.includes('telefone') && !h.includes('2')));
      const telefone2Index = headers.findIndex(h => h.includes('telefone 2') || h.includes('telefone2'));
      const cpfIndex = headers.findIndex(h => h.includes('cpf'));
      const tagIndex = headers.findIndex(h => h.includes('tag') || h.includes('perfil') || h.includes('classificação') || h.includes('classificacao'));

      if (nomeIndex === -1 || telefoneIndex === -1) {
        toast({
          title: "Colunas obrigatórias não encontradas",
          description: "O arquivo deve conter as colunas: Nome, Telefone 1 (Telefone 2, CPF e Tag são opcionais). O Convênio é definido no seletor acima.",
          variant: "destructive",
        });
        setIsParsing(false);
        return;
      }

      const leads: ParsedLead[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        const nome = values[nomeIndex]?.trim() || '';
        const convenio = effectiveConvenio;
        const telefone = values[telefoneIndex]?.replace(/\D/g, '') || '';
        const telefone2 = telefone2Index !== -1 ? values[telefone2Index]?.replace(/\D/g, '') || '' : '';
        const cpfRaw = cpfIndex !== -1 ? values[cpfIndex] : '';
        const cpfNormalized = cpfIndex !== -1 && cpfRaw ? normalizeCPF(cpfRaw) : null;
        const tag = tagIndex !== -1 ? values[tagIndex]?.trim() || '' : '';

        let valid = true;
        let error = '';

        if (!nome) {
          valid = false;
          error = 'Nome vazio';
        } else if (!telefone || telefone.length < 10) {
          valid = false;
          error = 'Telefone 1 inválido';
        } else if (telefone2 && telefone2.length < 10) {
          valid = false;
          error = 'Telefone 2 inválido';
        } else if (cpfIndex !== -1 && cpfRaw && !cpfNormalized) {
          valid = false;
          error = 'CPF inválido';
        }

        leads.push({ nome, convenio, telefone, telefone2: telefone2 || undefined, cpf: cpfNormalized || undefined, tag: tag || undefined, valid, error });
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

  const parseXLSX = async (xlsxFile: File) => {
    setIsParsing(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await xlsxFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', raw: false });
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, raw: false, defval: '' });
      
      if (data.length < 2) {
        toast({
          title: "Arquivo vazio",
          description: "O arquivo Excel não contém dados para importar",
          variant: "destructive",
        });
        setIsParsing(false);
        return;
      }

      // Parse header to find column indexes
      const headers = (data[0] as string[]).map(h => String(h || '').toLowerCase().trim());
      
      const nomeIndex = headers.findIndex(h => h.includes('nome'));
      const telefoneIndex = headers.findIndex(h => h.includes('telefone 1') || h.includes('telefone1') || (h.includes('telefone') && !h.includes('2')));
      const telefone2Index = headers.findIndex(h => h.includes('telefone 2') || h.includes('telefone2'));
      const cpfIndex = headers.findIndex(h => h.includes('cpf'));
      const tagIndex = headers.findIndex(h => h.includes('tag') || h.includes('perfil') || h.includes('classificação') || h.includes('classificacao'));

      if (nomeIndex === -1 || telefoneIndex === -1) {
        toast({
          title: "Colunas obrigatórias não encontradas",
          description: "O arquivo deve conter as colunas: Nome, Telefone 1 (Telefone 2, CPF e Tag são opcionais). O Convênio é definido no seletor acima.",
          variant: "destructive",
        });
        setIsParsing(false);
        return;
      }

      const leads: ParsedLead[] = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as string[];
        
        const nome = String(row[nomeIndex] || '').trim();
        const convenio = effectiveConvenio;
        const telefone = String(row[telefoneIndex] || '').replace(/\D/g, '');
        const telefone2 = telefone2Index !== -1 ? String(row[telefone2Index] || '').replace(/\D/g, '') : '';
        const cpfRaw = cpfIndex !== -1 ? String(row[cpfIndex] || '') : '';
        const cpfNormalized = cpfIndex !== -1 && cpfRaw ? normalizeCPF(cpfRaw) : null;
        const tag = tagIndex !== -1 ? String(row[tagIndex] || '').trim() : '';

        let valid = true;
        let error = '';

        if (!nome) {
          valid = false;
          error = 'Nome vazio';
        } else if (!telefone || telefone.length < 10) {
          valid = false;
          error = 'Telefone 1 inválido';
        } else if (telefone2 && telefone2.length < 10) {
          valid = false;
          error = 'Telefone 2 inválido';
        } else if (cpfIndex !== -1 && cpfRaw && !cpfNormalized) {
          valid = false;
          error = 'CPF inválido';
        }

        leads.push({ nome, convenio, telefone, telefone2: telefone2 || undefined, cpf: cpfNormalized || undefined, tag: tag || undefined, valid, error });
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
      console.error('Error parsing XLSX:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Não foi possível ler o arquivo Excel",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const [importProgress, setImportProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

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
    setImportProgress(0);
    
    try {
      // Process in batches of 100 to avoid timeout
      const BATCH_SIZE = 100;
      const batches: typeof validLeads[] = [];
      
      for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
        batches.push(validLeads.slice(i, i + BATCH_SIZE));
      }
      
      setTotalBatches(batches.length);
      
      let totalImported = 0;
      let totalDuplicates = 0;
      let totalInvalid = 0;
      const allDuplicateDetails: ImportResult['duplicate_details'] = [];
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        setCurrentBatch(batchIndex + 1);
        const batch = batches[batchIndex];
        
        let data: any, error: any;

        if (baseFormat === 'governo') {
          const leadsData = batch.map(lead => ({
            nome: lead.nome,
            cpf: lead.cpf || '',
            convenio: lead.convenio || 'GOVERNO BA',
            telefone: lead.telefone || '',
            matricula: lead.matricula || '',
            banco: lead.banco || '',
            situacao: lead.situacao || '',
            ade: lead.ade || '',
            servico_servidor: lead.servico_servidor || '',
            tipo_servico_servidor: lead.tipo_servico_servidor || '',
            servico_consignataria: lead.servico_consignataria || '',
            margem_disponivel: lead.margem_disponivel || '',
            margem_total: lead.margem_total || '',
            parcela: lead.parcela || '',
            parcelas_em_aberto: lead.parcelas_em_aberto || '',
            parcelas_pagas: lead.parcelas_pagas || '',
            deferimento: lead.deferimento || '',
            quitacao: lead.quitacao || '',
            ultimo_desconto: lead.ultimo_desconto || '',
            ultima_parcela: lead.ultima_parcela || '',
            origem_base: 'governo_ba',
          }));
          ({ data, error } = await (supabase as any).rpc('import_leads_governo', { leads_data: leadsData }));
        } else {
          const leadsData = batch.map(lead => ({
            nome: lead.nome,
            cpf: lead.cpf || '',
            convenio: lead.convenio,
            telefone: lead.telefone,
            telefone2: lead.telefone2 || null,
            tag: lead.tag || null,
          }));
          ({ data, error } = await supabase.rpc('import_leads_from_csv', { leads_data: leadsData }));
        }

        if (error) throw error;

        const batchResult = data as unknown as ImportResult;
        totalImported += batchResult.imported;
        totalDuplicates += batchResult.duplicates;
        totalInvalid += batchResult.invalid || 0;
        
        if (batchResult.duplicate_details) {
          allDuplicateDetails.push(...batchResult.duplicate_details);
        }
        
        // Update progress
        const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
        setImportProgress(progress);
      }
      
      const result: ImportResult = {
        success: totalImported > 0,
        imported: totalImported,
        duplicates: totalDuplicates,
        invalid: totalInvalid,
        duplicate_details: allDuplicateDetails
      };
      
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
      
      const { data: importLogData } = await supabase.from('import_logs').insert({
        module: 'leads_database',
        file_name: file?.name || 'unknown.csv',
        file_hash: fileHash,
        file_size_bytes: file?.size || 0,
        total_records: parsedLeads.length,
        success_count: result.imported,
        error_count: result.invalid || 0,
        duplicate_count: result.duplicates,
        status: 'completed',
        imported_by: user!.id,
        company_id: companyId,
      }).select('id').single();

      // Executa varredura automática de duplicatas após importação (Leads Premium)
      if (result.imported > 0) {
        try {
          const { data: scanResult } = await supabase.rpc('trigger_duplicate_scan_after_import', {
            p_module: 'leads',
            p_import_log_id: importLogData?.id || null
          });
          console.log('Auto-scan de duplicatas executado (leads):', scanResult);
        } catch (scanError) {
          console.warn('Auto-scan de duplicatas falhou (não crítico):', scanError);
        }
      }

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
    const template = '# Convenio sera definido no momento da importacao - nao inclua coluna Convenio\nNome,Telefone 1,Telefone 2,CPF,Tag\nJoão Silva,11999998888,11988887776,12345678901,Tomador\nMaria Santos,21988887777,,,Com margem para emprestimo\nCarlos Lima,71977776666,71966665555,98765432100,Reducao de parcela\nAna Souza,61955554444,,,Servidor federal';
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

      {/* Seletor de Convênio */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 space-y-2">
          <Label className="text-sm font-medium">Convênio destes leads <span className="text-destructive">*</span></Label>
          <Select
            value={effectiveConvenio}
            onValueChange={(v) => setSelectedConvenio(v)}
            disabled={baseFormat === 'governo'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o convênio antes de escolher o arquivo" />
            </SelectTrigger>
            <SelectContent>
              {CONVENIO_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {effectiveConvenio && (
            <p className="text-xs text-muted-foreground">
              Todos os leads deste arquivo serão importados como <strong>{CONVENIO_OPTIONS.find(o => o.value === effectiveConvenio)?.label || effectiveConvenio}</strong>. CPFs com menos de 11 dígitos serão completados com zeros à esquerda automaticamente.
            </p>
          )}
          {baseFormat === 'governo' && (
            <p className="text-xs text-muted-foreground">O formato Governo BA já define o convênio automaticamente.</p>
          )}
        </CardContent>
      </Card>

      {/* Seletor de tipo de base */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <Label className="text-sm font-medium mb-2 block">Tipo de base a importar</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setBaseFormat('padrao'); setShowPreview(false); setParsedLeads([]); setFile(null); if (fileInputRef.current) fileInputRef.current.value=''; }}
              className={`text-left p-4 rounded-lg border-2 transition-all ${baseFormat === 'padrao' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
            >
              <div className="font-semibold text-sm">📞 Padrão (INSS / SIAPE / Convênios)</div>
              <div className="text-xs text-muted-foreground mt-1">Nome, Telefone e Convênio (INSS, SIAPE ou qualquer outro). Ideal para prospecção por telefone.</div>
            </button>
            <button
              type="button"
              onClick={() => { setBaseFormat('governo'); setShowPreview(false); setParsedLeads([]); setFile(null); if (fileInputRef.current) fileInputRef.current.value=''; }}
              className={`text-left p-4 rounded-lg border-2 transition-all ${baseFormat === 'governo' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
            >
              <div className="font-semibold text-sm">🏛️ Governo BA (servidor público)</div>
              <div className="text-xs text-muted-foreground mt-1">CPF, Servidor, Matrícula, Banco, Margem Disponível, Valor de Parcela, ADE...</div>
            </button>
          </div>
        </CardContent>
      </Card>

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
                <li>• Arquivo CSV ou Excel (XLSX/XLS)</li>
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
                <li>• <strong>Convênio</strong> - <em>definido no seletor acima, não inclua na planilha</em></li>
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
                <h3 className="text-lg font-semibold">Selecione o arquivo CSV ou Excel</h3>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte ou clique para selecionar
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="file-upload" className={effectiveConvenio ? "cursor-pointer" : "cursor-not-allowed"}>
                  <Input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isParsing || !effectiveConvenio}
                  />
                  <Button asChild disabled={isParsing || !effectiveConvenio}>
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
                {!effectiveConvenio && (
                  <p className="text-xs text-destructive">Selecione o convênio acima primeiro.</p>
                )}
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
                      Lote {currentBatch}/{totalBatches} ({importProgress}%)
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
            {/* Import Progress */}
            {isLoading && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Importando em lotes para evitar timeout...
                  </span>
                  <span className="text-muted-foreground">
                    Lote {currentBatch} de {totalBatches}
                  </span>
                </div>
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {importProgress}% concluído - Por favor, aguarde...
                </p>
              </div>
            )}
            
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

      {/* Duplicate File Alert */}
      <DuplicateFileAlert
        isOpen={showDuplicateAlert}
        onClose={handleDuplicateCancel}
        onConfirm={handleDuplicateConfirm}
        duplicateInfo={duplicateInfo}
        currentFileName={pendingFile?.name}
      />
    </div>
  );
}
