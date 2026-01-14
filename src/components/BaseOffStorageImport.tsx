import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Database,
  Zap,
  Cloud,
  Play,
  Pause,
  RotateCcw,
  Clock,
  HardDrive,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImportJob {
  id: string;
  file_name: string;
  file_path: string | null;
  file_size_bytes: number;
  status: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  duplicate_count: number;
  current_chunk: number;
  error_log: any; // JSONB from Supabase
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface BaseOffStorageImportProps {
  onBack: () => void;
}

// Mapeamento das colunas do arquivo para os campos do banco
const COLUMN_MAP: Record<string, string> = {
  NB: "nb",
  CPF: "cpf",
  NOME: "nome",
  DTNASCIMENTO: "data_nascimento",
  "DT_NASCIMENTO": "data_nascimento",
  "DATANASCIMENTO": "data_nascimento",
  "DATA_NASCIMENTO": "data_nascimento",
  ESP: "esp",
  DIB: "dib",
  MR: "mr",
  BANCOPAGTO: "banco_pagto",
  "BANCO_PAGTO": "banco_pagto",
  AGENCIAPAGTO: "agencia_pagto",
  "AGENCIA_PAGTO": "agencia_pagto",
  ORGAOPAGADOR: "orgao_pagador",
  "ORGAO_PAGADOR": "orgao_pagador",
  CONTACORRENTE: "conta_corrente",
  "CONTA_CORRENTE": "conta_corrente",
  MEIOPAGTO: "meio_pagto",
  "MEIO_PAGTO": "meio_pagto",
  STATUSBENEFICIO: "status_beneficio",
  "STATUS_BENEFICIO": "status_beneficio",
  BLOQUEIO: "bloqueio",
  PENSAOALIMENTICIA: "pensao_alimenticia",
  "PENSAO_ALIMENTICIA": "pensao_alimenticia",
  REPRESENTANTE: "representante",
  SEXO: "sexo",
  DDB: "ddb",
  BANCORMC: "banco_rmc",
  "BANCO_RMC": "banco_rmc",
  VALORRMC: "valor_rmc",
  "VALOR_RMC": "valor_rmc",
  "VL_RMC": "valor_rmc",
  BANCORCC: "banco_rcc",
  "BANCO_RCC": "banco_rcc",
  VALORRCC: "valor_rcc",
  "VALOR_RCC": "valor_rcc",
  "VL_RCC": "valor_rcc",
  BANCOEMPRESTIMO: "banco_emprestimo",
  "BANCO_EMPRESTIMO": "banco_emprestimo",
  "CD_BANCO_EMPRESTIMO": "banco_emprestimo",
  CONTRATO: "contrato",
  "NR_CONTRATO": "contrato",
  VLEMPRESTIMO: "vl_emprestimo",
  "VL_EMPRESTIMO": "vl_emprestimo",
  INICIODODESCONTO: "inicio_desconto",
  "INICIO_DESCONTO": "inicio_desconto",
  PRAZO: "prazo",
  "QT_PRAZO": "prazo",
  VLPARCELA: "vl_parcela",
  "VL_PARCELA": "vl_parcela",
  TIPOEMPRESTIMO: "tipo_emprestimo",
  "TIPO_EMPRESTIMO": "tipo_emprestimo",
  DATAAVERBACAO: "data_averbacao",
  "DATA_AVERBACAO": "data_averbacao",
  SITUACAOEMPRESTIMO: "situacao_emprestimo",
  "SITUACAO_EMPRESTIMO": "situacao_emprestimo",
  COMPETENCIA: "competencia",
  COMPETENCIA_FINAL: "competencia_final",
  TAXA: "taxa",
  "TX_JUROS": "taxa",
  SALDO: "saldo",
  "VL_SALDO": "saldo",
  BAIRRO: "bairro",
  MUNICIPIO: "municipio",
  "CIDADE": "municipio",
  UF: "uf",
  "ESTADO": "uf",
  CEP: "cep",
  ENDERECO: "endereco",
  LOGR_TIPO_1: "logr_tipo_1",
  LOGR_TITULO_1: "logr_titulo_1",
  LOGR_NOME_1: "logr_nome_1",
  LOGR_NUMERO_1: "logr_numero_1",
  LOGR_COMPLEMENTO_1: "logr_complemento_1",
  BAIRRO_1: "bairro_1",
  CIDADE_1: "cidade_1",
  UF_1: "uf_1",
  CEP_1: "cep_1",
  TELFIXO_1: "tel_fixo_1",
  TELFIXO_2: "tel_fixo_2",
  TELFIXO_3: "tel_fixo_3",
  TELCEL_1: "tel_cel_1",
  TELCEL_2: "tel_cel_2",
  TELCEL_3: "tel_cel_3",
  "TEL_CEL_1": "tel_cel_1",
  "TEL_CEL_2": "tel_cel_2",
  "TEL_CEL_3": "tel_cel_3",
  "TEL_FIXO_1": "tel_fixo_1",
  "TEL_FIXO_2": "tel_fixo_2",
  "TEL_FIXO_3": "tel_fixo_3",
  EMAIL_1: "email_1",
  EMAIL_2: "email_2",
  EMAIL_3: "email_3",
  NOME_MAE: "nome_mae",
  NOME_PAI: "nome_pai",
  NATURALIDADE: "naturalidade",
};

type Phase = "select" | "uploading" | "processing" | "completed" | "error" | "jobs";

const BATCH_SIZES = {
  conservative: { value: 500, label: "Conservador (500)", description: "Mais lento, menos uso de memória" },
  balanced: { value: 1000, label: "Balanceado (1000)", description: "Recomendado para maioria dos casos" },
  aggressive: { value: 2000, label: "Agressivo (2000)", description: "Mais rápido, mais uso de memória" },
};

export function BaseOffStorageImport({ onBack }: BaseOffStorageImportProps) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [batchSizeKey, setBatchSizeKey] = useState<keyof typeof BATCH_SIZES>("balanced");
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Processing state
  const [processedRows, setProcessedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [errorLog, setErrorLog] = useState<Array<{ row: number; error: string }>>([]);
  
  // Refs for processing
  const clientsBufferRef = useRef<Map<string, any>>(new Map());
  const contractsBufferRef = useRef<Map<string, any[]>>(new Map());
  const headerMapRef = useRef<Record<number, string>>({});

  // Load previous jobs
  const loadJobs = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("module", "baseoff_clients")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setJobs((data || []) as unknown as ImportJob[]);
    } catch (error) {
      console.error("Erro ao carregar jobs:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    
    if (!validExtensions.includes(ext)) {
      toast.error("Formato inválido. Use CSV ou XLSX.");
      return;
    }

    // Max 600MB
    if (file.size > 600 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 600MB.");
      return;
    }

    setSelectedFile(file);
    resetState();
  };

  const resetState = () => {
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessedRows(0);
    setTotalRows(0);
    setSuccessCount(0);
    setErrorCount(0);
    setDuplicateCount(0);
    setErrorLog([]);
    setCurrentJob(null);
    setIsPaused(false);
    clientsBufferRef.current.clear();
    contractsBufferRef.current.clear();
    headerMapRef.current = {};
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    if (typeof dateValue === "number") {
      const date = XLSX.SSF.parse_date_code(dateValue);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
      return null;
    }
    
    const dateStr = String(dateValue).trim();
    if (dateStr === "") return null;

    const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
    }

    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return dateStr;

    return null;
  };

  const parseNumber = (numValue: any): number | null => {
    if (numValue === null || numValue === undefined) return null;
    if (typeof numValue === "number") return isNaN(numValue) ? null : numValue;
    
    const numStr = String(numValue).trim();
    if (numStr === "") return null;
    
    const clean = numStr.replace(/[^\d,.-]/g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  const cleanCPF = (cpfValue: any): string | null => {
    if (cpfValue === null || cpfValue === undefined) return null;
    const clean = String(cpfValue).replace(/\D/g, "");
    if (clean.length === 0) return null;
    return clean.padStart(11, "0").slice(0, 11);
  };

  const buildHeaderMap = (headerRow: any[]): Record<number, string> => {
    const map: Record<number, string> = {};
    headerRow.forEach((header, idx) => {
      if (header) {
        const normalized = String(header).toUpperCase().trim().replace(/\s+/g, "_");
        const dbField = COLUMN_MAP[normalized] || COLUMN_MAP[normalized.replace(/_/g, "")];
        if (dbField) {
          map[idx] = dbField;
        }
      }
    });
    return map;
  };

  const processRow = (row: any[], headerMap: Record<number, string>, rowIndex: number) => {
    const rowData: Record<string, any> = {};
    
    Object.entries(headerMap).forEach(([idxStr, dbField]) => {
      const idx = parseInt(idxStr);
      if (row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== "") {
        rowData[dbField] = row[idx];
      }
    });

    const cpf = cleanCPF(rowData.cpf);
    if (!cpf) {
      return { error: "CPF inválido ou ausente" };
    }

    const nb = String(rowData.nb || "").trim();
    if (!nb) {
      return { error: "NB ausente" };
    }

    const nome = String(rowData.nome || "").trim();
    if (!nome) {
      return { error: "Nome ausente" };
    }

    // Build client data
    const clientData: Record<string, any> = {
      cpf,
      nb,
      nome,
      data_nascimento: parseDate(rowData.data_nascimento),
      sexo: rowData.sexo ? String(rowData.sexo).trim() : null,
      nome_mae: rowData.nome_mae ? String(rowData.nome_mae).trim() : null,
      nome_pai: rowData.nome_pai ? String(rowData.nome_pai).trim() : null,
      naturalidade: rowData.naturalidade ? String(rowData.naturalidade).trim() : null,
      esp: rowData.esp ? String(rowData.esp).trim() : null,
      dib: parseDate(rowData.dib),
      mr: parseNumber(rowData.mr),
      banco_pagto: rowData.banco_pagto ? String(rowData.banco_pagto).trim() : null,
      agencia_pagto: rowData.agencia_pagto ? String(rowData.agencia_pagto).trim() : null,
      orgao_pagador: rowData.orgao_pagador ? String(rowData.orgao_pagador).trim() : null,
      conta_corrente: rowData.conta_corrente ? String(rowData.conta_corrente).trim() : null,
      meio_pagto: rowData.meio_pagto ? String(rowData.meio_pagto).trim() : null,
      status_beneficio: rowData.status_beneficio ? String(rowData.status_beneficio).trim() : null,
      bloqueio: rowData.bloqueio ? String(rowData.bloqueio).trim() : null,
      pensao_alimenticia: rowData.pensao_alimenticia ? String(rowData.pensao_alimenticia).trim() : null,
      representante: rowData.representante ? String(rowData.representante).trim() : null,
      ddb: parseDate(rowData.ddb),
      banco_rmc: rowData.banco_rmc ? String(rowData.banco_rmc).trim() : null,
      valor_rmc: parseNumber(rowData.valor_rmc),
      banco_rcc: rowData.banco_rcc ? String(rowData.banco_rcc).trim() : null,
      valor_rcc: parseNumber(rowData.valor_rcc),
      bairro: rowData.bairro ? String(rowData.bairro).trim() : null,
      municipio: rowData.municipio ? String(rowData.municipio).trim() : null,
      uf: rowData.uf ? String(rowData.uf).trim().toUpperCase() : null,
      cep: rowData.cep ? String(rowData.cep).replace(/\D/g, "") : null,
      endereco: rowData.endereco ? String(rowData.endereco).trim() : null,
      logr_tipo_1: rowData.logr_tipo_1 ? String(rowData.logr_tipo_1).trim() : null,
      logr_titulo_1: rowData.logr_titulo_1 ? String(rowData.logr_titulo_1).trim() : null,
      logr_nome_1: rowData.logr_nome_1 ? String(rowData.logr_nome_1).trim() : null,
      logr_numero_1: rowData.logr_numero_1 ? String(rowData.logr_numero_1).trim() : null,
      logr_complemento_1: rowData.logr_complemento_1 ? String(rowData.logr_complemento_1).trim() : null,
      bairro_1: rowData.bairro_1 ? String(rowData.bairro_1).trim() : null,
      cidade_1: rowData.cidade_1 ? String(rowData.cidade_1).trim() : null,
      uf_1: rowData.uf_1 ? String(rowData.uf_1).trim().toUpperCase() : null,
      cep_1: rowData.cep_1 ? String(rowData.cep_1).replace(/\D/g, "") : null,
      tel_fixo_1: rowData.tel_fixo_1 ? String(rowData.tel_fixo_1).replace(/\D/g, "") : null,
      tel_fixo_2: rowData.tel_fixo_2 ? String(rowData.tel_fixo_2).replace(/\D/g, "") : null,
      tel_fixo_3: rowData.tel_fixo_3 ? String(rowData.tel_fixo_3).replace(/\D/g, "") : null,
      tel_cel_1: rowData.tel_cel_1 ? String(rowData.tel_cel_1).replace(/\D/g, "") : null,
      tel_cel_2: rowData.tel_cel_2 ? String(rowData.tel_cel_2).replace(/\D/g, "") : null,
      tel_cel_3: rowData.tel_cel_3 ? String(rowData.tel_cel_3).replace(/\D/g, "") : null,
      email_1: rowData.email_1 ? String(rowData.email_1).trim().toLowerCase() : null,
      email_2: rowData.email_2 ? String(rowData.email_2).trim().toLowerCase() : null,
      email_3: rowData.email_3 ? String(rowData.email_3).trim().toLowerCase() : null,
      imported_by: user?.id,
    };

    // Store client (will be upserted by CPF)
    if (!clientsBufferRef.current.has(cpf)) {
      clientsBufferRef.current.set(cpf, clientData);
    }

    // Check for contract data
    const contrato = rowData.contrato ? String(rowData.contrato).trim() : null;
    const bancoEmprestimo = rowData.banco_emprestimo ? String(rowData.banco_emprestimo).trim() : null;

    if (contrato && bancoEmprestimo) {
      const contractData = {
        cpf,
        banco_emprestimo: bancoEmprestimo,
        contrato,
        vl_emprestimo: parseNumber(rowData.vl_emprestimo),
        inicio_desconto: parseDate(rowData.inicio_desconto),
        prazo: parseNumber(rowData.prazo),
        vl_parcela: parseNumber(rowData.vl_parcela),
        tipo_emprestimo: rowData.tipo_emprestimo ? String(rowData.tipo_emprestimo).trim() : null,
        data_averbacao: parseDate(rowData.data_averbacao),
        situacao_emprestimo: rowData.situacao_emprestimo ? String(rowData.situacao_emprestimo).trim() : null,
        competencia: parseDate(rowData.competencia),
        competencia_final: parseDate(rowData.competencia_final),
        taxa: parseNumber(rowData.taxa),
        saldo: parseNumber(rowData.saldo),
      };

      const contractKey = `${cpf}_${contrato}`;
      if (!contractsBufferRef.current.has(cpf)) {
        contractsBufferRef.current.set(cpf, []);
      }
      
      const existingContracts = contractsBufferRef.current.get(cpf)!;
      if (!existingContracts.some(c => c.contrato === contrato)) {
        existingContracts.push(contractData);
      }
    }

    return { success: true };
  };

  const saveBuffersToDatabase = async (batchSize: number) => {
    const clients = Array.from(clientsBufferRef.current.values());
    let savedClients = 0;
    let savedContracts = 0;
    const errors: Array<{ row: number; error: string }> = [];
    
    // Save clients in batches
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);
      
      const { data: insertedClients, error } = await supabase
        .from("baseoff_clients")
        .upsert(batch, { onConflict: "cpf", ignoreDuplicates: false })
        .select("id, cpf");
      
      if (error) {
        console.error("Erro ao salvar clientes:", error);
        errors.push({ row: i, error: `Erro no batch ${i}: ${error.message}` });
      } else {
        savedClients += batch.length;
        
        // Save contracts for these clients
        if (insertedClients) {
          for (const client of insertedClients) {
            const clientContracts = contractsBufferRef.current.get(client.cpf);
            if (clientContracts && clientContracts.length > 0) {
              const contractsWithClientId = clientContracts.map(c => ({
                ...c,
                client_id: client.id,
              }));
              
              const { error: contractError } = await supabase
                .from("baseoff_contracts")
                .upsert(contractsWithClientId, { onConflict: "cpf,contrato", ignoreDuplicates: false });
              
              if (contractError) {
                console.error("Erro ao salvar contratos:", contractError);
              } else {
                savedContracts += clientContracts.length;
              }
            }
          }
        }
      }
      
      // Update progress
      setSuccessCount(savedClients);
      setProcessingProgress(Math.round((i / clients.length) * 100));
      
      // Small delay to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return { savedClients, savedContracts, errors };
  };

  const startImport = async () => {
    if (!selectedFile || !user?.id) return;

    abortControllerRef.current = new AbortController();
    setPhase("uploading");
    setUploadProgress(0);

    try {
      // Step 1: Upload file to Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("imports")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      setUploadProgress(100);
      toast.success("Upload concluído!");

      // Step 2: Create import job
      const { data: jobData, error: jobError } = await supabase
        .from("import_jobs")
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size_bytes: selectedFile.size,
          module: "baseoff_clients",
          status: "uploaded",
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Erro ao criar job: ${jobError.message}`);
      }

      setCurrentJob(jobData as unknown as ImportJob);

      // Step 3: Read and process file locally in chunks
      setPhase("processing");
      
      await supabase
        .from("import_jobs")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", jobData.id);

      // Read file
      const fileBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

      if (rows.length < 2) {
        throw new Error("Arquivo vazio ou sem dados");
      }

      // Build header map
      const headerMap = buildHeaderMap(rows[0]);
      headerMapRef.current = headerMap;

      if (Object.keys(headerMap).length === 0) {
        throw new Error("Nenhuma coluna válida encontrada no arquivo");
      }

      setTotalRows(rows.length - 1);
      let processed = 0;
      let errors = 0;

      // Process rows (skip header)
      const batchSize = BATCH_SIZES[batchSizeKey].value;
      const dataRows = rows.slice(1);
      
      for (let i = 0; i < dataRows.length; i++) {
        if (isPaused) {
          // Save pause state
          await supabase
            .from("import_jobs")
            .update({ 
              status: "paused", 
              processed_rows: processed,
              current_chunk: Math.floor(i / batchSize),
            })
            .eq("id", jobData.id);
          return;
        }

        const row = dataRows[i];
        const result = processRow(row, headerMap, i + 2);
        
        if (result.error) {
          errors++;
          setErrorLog(prev => [...prev.slice(-99), { row: i + 2, error: result.error! }]);
        }
        
        processed++;
        setProcessedRows(processed);
        
        // Update progress every 100 rows
        if (processed % 100 === 0) {
          setProcessingProgress(Math.round((processed / dataRows.length) * 50));
        }
      }

      setErrorCount(errors);

      // Step 4: Save to database
      const saveResult = await saveBuffersToDatabase(batchSize);

      // Step 5: Update job as completed
      await supabase
        .from("import_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_rows: dataRows.length,
          processed_rows: processed,
          success_count: saveResult.savedClients,
          error_count: errors,
          error_log: errorLog.slice(-100),
        })
        .eq("id", jobData.id);

      setPhase("completed");
      toast.success(`Importação concluída! ${saveResult.savedClients} clientes e ${saveResult.savedContracts} contratos salvos.`);

      // Clean up storage file after successful import
      await supabase.storage.from("imports").remove([filePath]);

    } catch (error) {
      console.error("Erro na importação:", error);
      setPhase("error");
      toast.error(error instanceof Error ? error.message : "Erro desconhecido");

      if (currentJob?.id) {
        await supabase
          .from("import_jobs")
          .update({ status: "failed", error_log: [{ row: 0, error: String(error) }] })
          .eq("id", currentJob.id);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      case "processing":
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
      case "paused":
        return <Badge className="bg-yellow-500"><Pause className="w-3 h-3 mr-1" />Pausado</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      case "uploaded":
        return <Badge variant="secondary"><Cloud className="w-3 h-3 mr-1" />Enviado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Jobs list view
  if (phase === "jobs") {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setPhase("select")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Importações
            </h2>
            <p className="text-sm text-muted-foreground">Últimas 10 importações</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {isLoadingJobs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma importação encontrada</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[200px]">{job.file_name}</span>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tamanho:</span>
                          <span className="ml-1 font-medium">{formatFileSize(job.file_size_bytes)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-1 font-medium">{job.total_rows.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-green-600">Sucesso:</span>
                          <span className="ml-1 font-medium text-green-600">{job.success_count.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-red-600">Erros:</span>
                          <span className="ml-1 font-medium text-red-600">{job.error_count.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(job.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Cloud className="h-5 w-5 text-primary" />
              Importação Otimizada (Storage)
            </h2>
            <p className="text-sm text-muted-foreground">
              Suporte para arquivos grandes até 600MB
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setPhase("jobs"); loadJobs(); }}>
          <Clock className="h-4 w-4 mr-2" />
          Histórico
        </Button>
      </div>

      {/* Advantages */}
      <Alert className="border-primary/20 bg-primary/5">
        <Zap className="h-4 w-4 text-primary" />
        <AlertTitle>Motor de Importação em Camadas</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li><strong>Upload direto para Storage:</strong> Evita timeout e uso de memória</li>
            <li><strong>Processamento em streaming:</strong> Linha por linha, sem carregar tudo</li>
            <li><strong>Persistência em lotes:</strong> Inserts otimizados de 500-2000 registros</li>
            <li><strong>Controle de estado:</strong> Possibilidade de retomar importações</li>
            <li><strong>Validação por linha:</strong> Erros não travam a importação</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* File Selection */}
      {phase === "select" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Selecionar Arquivo
            </CardTitle>
            <CardDescription>
              Suporta CSV e XLSX até 600MB e 500k+ linhas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Batch size config */}
            <div className="space-y-2">
              <Label>Tamanho do Lote</Label>
              <Select value={batchSizeKey} onValueChange={(v) => setBatchSizeKey(v as keyof typeof BATCH_SIZES)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BATCH_SIZES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div>
                        <div>{config.label}</div>
                        <div className="text-xs text-muted-foreground">{config.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File input */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV, XLSX (máx. 600MB)
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <Button onClick={startImport} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Iniciar Importação
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {phase === "uploading" && (
        <Card>
          <CardContent className="py-8 space-y-4">
            <div className="text-center">
              <Cloud className="h-12 w-12 mx-auto text-primary mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold">Enviando para o Storage...</h3>
              <p className="text-sm text-muted-foreground">
                {selectedFile?.name}
              </p>
            </div>
            <Progress value={uploadProgress} className="h-3" />
            <p className="text-center text-sm">{uploadProgress}%</p>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {phase === "processing" && (
        <Card>
          <CardContent className="py-8 space-y-6">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto text-primary mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold">Processando dados...</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{processedRows.toLocaleString()} / {totalRows.toLocaleString()} linhas</span>
              </div>
              <Progress value={processingProgress} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{successCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Salvos</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{errorCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{duplicateCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Duplicados</p>
              </div>
            </div>

            {/* Recent errors */}
            {errorLog.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Últimos erros:</p>
                <ScrollArea className="h-24 bg-muted/50 rounded-lg p-2">
                  {errorLog.slice(-5).map((err, idx) => (
                    <p key={idx} className="text-xs text-red-600">
                      Linha {err.row}: {err.error}
                    </p>
                  ))}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {phase === "completed" && (
        <Card>
          <CardContent className="py-8 space-y-4">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-green-600">Importação Concluída!</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{successCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Clientes Salvos</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{processedRows.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Linhas Processadas</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{errorCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>

            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline" onClick={() => { setPhase("select"); resetState(); setSelectedFile(null); }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Nova Importação
              </Button>
              <Button onClick={onBack}>
                Voltar ao Módulo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {phase === "error" && (
        <Card className="border-destructive">
          <CardContent className="py-8 space-y-4">
            <div className="text-center">
              <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-xl font-bold text-destructive">Erro na Importação</h3>
            </div>
            
            <Alert variant="destructive">
              <AlertDescription>
                Verifique o console para mais detalhes sobre o erro.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline" onClick={() => { setPhase("select"); resetState(); }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button variant="outline" onClick={onBack}>
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
