import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Zap,
  Database,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useChunkedFileReader } from "@/hooks/useChunkedFileReader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  duplicates: number;
  contractsDetected: number;
  contractsInserted: number;
  errorDetails: Array<{ row: number; error: string; data?: any }>;
}

interface BaseOffImportEngineProps {
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
  "BANCO EMPRESTIMO": "banco_emprestimo",
  "CD_BANCO_EMPRESTIMO": "banco_emprestimo",
  "CDBANCO": "banco_emprestimo",
  "CD_BANCO": "banco_emprestimo",
  CONTRATO: "contrato",
  "NR_CONTRATO": "contrato",
  "NRCONTRATO": "contrato",
  "NUMERO_CONTRATO": "contrato",
  "ID_CONTRATO": "contrato",
  VLEMPRESTIMO: "vl_emprestimo",
  "VL_EMPRESTIMO": "vl_emprestimo",
  "VALOREMPRESTIMO": "vl_emprestimo",
  "VALOR_EMPRESTIMO": "vl_emprestimo",
  INICIODODESCONTO: "inicio_desconto",
  "INICIO_DESCONTO": "inicio_desconto",
  "INICIODESCONTO": "inicio_desconto",
  PRAZO: "prazo",
  "QT_PRAZO": "prazo",
  VLPARCELA: "vl_parcela",
  "VL_PARCELA": "vl_parcela",
  "VALORPARCELA": "vl_parcela",
  TIPOEMPRESTIMO: "tipo_emprestimo",
  "TIPO_EMPRESTIMO": "tipo_emprestimo",
  "CD_TIPO_EMPRESTIMO": "tipo_emprestimo",
  DATAAVERBACAO: "data_averbacao",
  "DATA_AVERBACAO": "data_averbacao",
  "DTAVERBACAO": "data_averbacao",
  "DT_AVERBACAO": "data_averbacao",
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
  "TELEFONE1": "tel_cel_1",
  "TELEFONE2": "tel_cel_2",
  "TELEFONE3": "tel_cel_3",
  EMAIL_1: "email_1",
  EMAIL_2: "email_2",
  EMAIL_3: "email_3",
  NOME_MAE: "nome_mae",
  "NOMEMAE": "nome_mae",
  NOME_PAI: "nome_pai",
  "NOMEPAI": "nome_pai",
  NATURALIDADE: "naturalidade",
};

type ImportPhase = "idle" | "reading" | "processing" | "saving" | "done";

export function BaseOffImportEngine({ onBack }: BaseOffImportEngineProps) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { readFileChunked, isReading, progress: readProgress, abort } = useChunkedFileReader();
  
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchSize, setBatchSize] = useState(500);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Buffers for chunked processing
  const clientsBufferRef = useRef<Map<string, any>>(new Map());
  const contractsBufferRef = useRef<Map<string, any[]>>(new Map());
  const processedContractsRef = useRef<Set<string>>(new Set());
  const headerMapRef = useRef<Record<number, string>>({});
  const importResultRef = useRef<ImportResult>({
    total: 0,
    success: 0,
    errors: 0,
    duplicates: 0,
    contractsDetected: 0,
    contractsInserted: 0,
    errorDetails: [],
  });
  const batchIdRef = useRef<string | null>(null);
  const currentRowRef = useRef(0);

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

    const numMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (numMatch) {
      return `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}`;
    }

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = [".csv", ".xlsx", ".xls"];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error("Formato inválido. Use arquivos CSV ou XLSX.");
        return;
      }
      
      setSelectedFile(file);
      setResult(null);
      setPhase("idle");
      
      // Reset buffers
      clientsBufferRef.current.clear();
      contractsBufferRef.current.clear();
      processedContractsRef.current.clear();
      headerMapRef.current = {};
      currentRowRef.current = 0;
      importResultRef.current = {
        total: 0,
        success: 0,
        errors: 0,
        duplicates: 0,
        contractsDetected: 0,
        contractsInserted: 0,
        errorDetails: [],
      };
    }
  };

  const processChunk = useCallback(async (rows: any[][], chunkIndex: number, isLast: boolean) => {
    const headerMap = headerMapRef.current;
    
    for (const row of rows) {
      currentRowRef.current++;
      const rowData: Record<string, any> = {};

      Object.entries(headerMap).forEach(([idxStr, dbField]) => {
        const idx = parseInt(idxStr);
        if (row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== "") {
          rowData[dbField] = row[idx];
        }
      });

      const cpf = cleanCPF(rowData.cpf);
      if (!cpf) {
        importResultRef.current.errors++;
        importResultRef.current.errorDetails.push({
          row: currentRowRef.current + 1,
          error: "CPF inválido ou ausente",
        });
        continue;
      }

      const nb = String(rowData.nb || "").trim();
      if (!nb) {
        importResultRef.current.errors++;
        importResultRef.current.errorDetails.push({
          row: currentRowRef.current + 1,
          error: "NB ausente",
        });
        continue;
      }

      // Add client if not exists
      if (!clientsBufferRef.current.has(cpf)) {
        clientsBufferRef.current.set(cpf, {
          nb: nb,
          cpf: cpf,
          nome: rowData.nome || "Não informado",
          data_nascimento: parseDate(rowData.data_nascimento),
          sexo: rowData.sexo ? String(rowData.sexo) : null,
          esp: rowData.esp ? String(rowData.esp) : null,
          dib: parseDate(rowData.dib),
          mr: parseNumber(rowData.mr),
          banco_pagto: rowData.banco_pagto ? String(rowData.banco_pagto) : null,
          agencia_pagto: rowData.agencia_pagto ? String(rowData.agencia_pagto) : null,
          orgao_pagador: rowData.orgao_pagador ? String(rowData.orgao_pagador) : null,
          conta_corrente: rowData.conta_corrente ? String(rowData.conta_corrente) : null,
          meio_pagto: rowData.meio_pagto ? String(rowData.meio_pagto) : null,
          status_beneficio: rowData.status_beneficio ? String(rowData.status_beneficio) : null,
          bloqueio: rowData.bloqueio ? String(rowData.bloqueio) : null,
          pensao_alimenticia: rowData.pensao_alimenticia ? String(rowData.pensao_alimenticia) : null,
          representante: rowData.representante ? String(rowData.representante) : null,
          ddb: parseDate(rowData.ddb),
          banco_rmc: rowData.banco_rmc ? String(rowData.banco_rmc) : null,
          valor_rmc: parseNumber(rowData.valor_rmc),
          banco_rcc: rowData.banco_rcc ? String(rowData.banco_rcc) : null,
          valor_rcc: parseNumber(rowData.valor_rcc),
          bairro: rowData.bairro ? String(rowData.bairro) : null,
          municipio: rowData.municipio ? String(rowData.municipio) : null,
          uf: rowData.uf ? String(rowData.uf) : null,
          cep: rowData.cep ? String(rowData.cep) : null,
          endereco: rowData.endereco ? String(rowData.endereco) : null,
          logr_tipo_1: rowData.logr_tipo_1 ? String(rowData.logr_tipo_1) : null,
          logr_titulo_1: rowData.logr_titulo_1 ? String(rowData.logr_titulo_1) : null,
          logr_nome_1: rowData.logr_nome_1 ? String(rowData.logr_nome_1) : null,
          logr_numero_1: rowData.logr_numero_1 ? String(rowData.logr_numero_1) : null,
          logr_complemento_1: rowData.logr_complemento_1 ? String(rowData.logr_complemento_1) : null,
          bairro_1: rowData.bairro_1 ? String(rowData.bairro_1) : null,
          cidade_1: rowData.cidade_1 ? String(rowData.cidade_1) : null,
          uf_1: rowData.uf_1 ? String(rowData.uf_1) : null,
          cep_1: rowData.cep_1 ? String(rowData.cep_1) : null,
          tel_fixo_1: rowData.tel_fixo_1 ? String(rowData.tel_fixo_1) : null,
          tel_fixo_2: rowData.tel_fixo_2 ? String(rowData.tel_fixo_2) : null,
          tel_fixo_3: rowData.tel_fixo_3 ? String(rowData.tel_fixo_3) : null,
          tel_cel_1: rowData.tel_cel_1 ? String(rowData.tel_cel_1) : null,
          tel_cel_2: rowData.tel_cel_2 ? String(rowData.tel_cel_2) : null,
          tel_cel_3: rowData.tel_cel_3 ? String(rowData.tel_cel_3) : null,
          email_1: rowData.email_1 ? String(rowData.email_1) : null,
          email_2: rowData.email_2 ? String(rowData.email_2) : null,
          email_3: rowData.email_3 ? String(rowData.email_3) : null,
          imported_by: user?.id,
          import_batch_id: batchIdRef.current,
        });
      }

      // Process contract if present
      const contrato = rowData.contrato ? String(rowData.contrato).trim() : null;
      const bancoEmprestimo = rowData.banco_emprestimo ? String(rowData.banco_emprestimo).trim() : null;
      
      if (contrato && bancoEmprestimo) {
        const contractKey = `${cpf}-${contrato}`;
        
        if (!processedContractsRef.current.has(contractKey)) {
          processedContractsRef.current.add(contractKey);
          
          if (!contractsBufferRef.current.has(cpf)) {
            contractsBufferRef.current.set(cpf, []);
          }

          contractsBufferRef.current.get(cpf)!.push({
            cpf: cpf,
            banco_emprestimo: bancoEmprestimo,
            contrato: contrato,
            vl_emprestimo: parseNumber(rowData.vl_emprestimo),
            inicio_desconto: parseDate(rowData.inicio_desconto),
            prazo: rowData.prazo ? parseInt(String(rowData.prazo)) : null,
            vl_parcela: parseNumber(rowData.vl_parcela),
            tipo_emprestimo: rowData.tipo_emprestimo ? String(rowData.tipo_emprestimo) : null,
            data_averbacao: parseDate(rowData.data_averbacao),
            situacao_emprestimo: rowData.situacao_emprestimo ? String(rowData.situacao_emprestimo) : null,
            competencia: parseDate(rowData.competencia),
            competencia_final: parseDate(rowData.competencia_final),
            taxa: parseNumber(rowData.taxa),
            saldo: parseNumber(rowData.saldo),
          });
        } else {
          importResultRef.current.duplicates++;
        }
      }
    }

    importResultRef.current.total = currentRowRef.current;
  }, [user?.id]);

  const saveToDatabase = async () => {
    setPhase("saving");
    setProgressText("Salvando clientes no banco de dados...");

    const clientsArray = Array.from(clientsBufferRef.current.values());
    let savedClients = 0;

    // Save clients in batches
    for (let i = 0; i < clientsArray.length; i += batchSize) {
      const batch = clientsArray.slice(i, i + batchSize);

      const { error } = await supabase.from("baseoff_clients").upsert(batch, {
        onConflict: "cpf",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("Erro ao inserir clientes:", error);
        importResultRef.current.errors += batch.length;
      } else {
        savedClients += batch.length;
        importResultRef.current.success = savedClients;
      }

      const percent = Math.round((savedClients / clientsArray.length) * 50);
      setProgress(percent);
      setProgressText(`Salvando clientes: ${savedClients}/${clientsArray.length}`);

      // Yield to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Get client IDs for contracts
    setProgressText("Vinculando contratos...");
    const cpfList = Array.from(clientsBufferRef.current.keys());
    const cpfToIdMap = new Map<string, string>();

    for (let i = 0; i < cpfList.length; i += 1000) {
      const cpfBatch = cpfList.slice(i, i + 1000);

      const { data: clientsBatch } = await supabase
        .from("baseoff_clients")
        .select("id, cpf")
        .in("cpf", cpfBatch)
        .limit(1000);

      clientsBatch?.forEach((c) => cpfToIdMap.set(c.cpf, c.id));
    }

    // Prepare contracts with client_id
    const allContracts: any[] = [];
    contractsBufferRef.current.forEach((contracts, cpf) => {
      const clientId = cpfToIdMap.get(cpf);
      if (clientId) {
        contracts.forEach((contract) => {
          allContracts.push({ ...contract, client_id: clientId });
        });
      }
    });

    importResultRef.current.contractsDetected = allContracts.length;

    // Save contracts in batches
    if (allContracts.length > 0) {
      setProgressText(`Salvando ${allContracts.length} contratos...`);
      let savedContracts = 0;

      for (let i = 0; i < allContracts.length; i += batchSize) {
        const batch = allContracts.slice(i, i + batchSize);

        const { error } = await supabase.from("baseoff_contracts").upsert(batch, {
          onConflict: "cpf,contrato",
          ignoreDuplicates: false,
        });

        if (error) {
          console.error("Erro ao inserir contratos:", error);
        } else {
          savedContracts += batch.length;
          importResultRef.current.contractsInserted = savedContracts;
        }

        const percent = 50 + Math.round((savedContracts / allContracts.length) * 50);
        setProgress(percent);
        setProgressText(`Salvando contratos: ${savedContracts}/${allContracts.length}`);

        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Update batch status
    if (batchIdRef.current) {
      await supabase
        .from("baseoff_import_batches")
        .update({
          status: "completed",
          total_records: importResultRef.current.total,
          success_count: importResultRef.current.success,
          error_count: importResultRef.current.errors,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchIdRef.current);
    }

    // Log import
    let companyId: string | null = null;
    const { data: userCompany } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user?.id || "")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (userCompany?.company_id) {
      companyId = userCompany.company_id;
    }

    await supabase.from("import_logs").insert({
      module: "baseoff_clients",
      file_name: selectedFile?.name || "unknown",
      total_records: importResultRef.current.total,
      success_count: importResultRef.current.success,
      error_count: importResultRef.current.errors,
      duplicate_count: importResultRef.current.duplicates,
      status: "completed",
      imported_by: user?.id || "",
      company_id: companyId,
    });

    setProgress(100);
    setPhase("done");
    setResult({ ...importResultRef.current });
    toast.success(
      `Importação concluída! ${importResultRef.current.success} clientes e ${importResultRef.current.contractsInserted} contratos.`
    );
  };

  const startImport = async () => {
    if (!selectedFile || !user?.id) return;

    setIsProcessing(true);
    setPhase("reading");
    setProgress(0);
    setResult(null);

    // Reset state
    clientsBufferRef.current.clear();
    contractsBufferRef.current.clear();
    processedContractsRef.current.clear();
    currentRowRef.current = 0;
    importResultRef.current = {
      total: 0,
      success: 0,
      errors: 0,
      duplicates: 0,
      contractsDetected: 0,
      contractsInserted: 0,
      errorDetails: [],
    };

    try {
      // Create import batch
      const { data: batchData, error: batchError } = await supabase
        .from("baseoff_import_batches")
        .insert({
          file_name: selectedFile.name,
          imported_by: user.id,
          status: "processing",
        })
        .select()
        .single();

      if (batchError) throw batchError;
      batchIdRef.current = batchData.id;

      setProgressText("Lendo arquivo...");

      // Read file and build header map
      const result = await readFileChunked(selectedFile, {
        chunkSize: batchSize,
        onProgress: (percent) => {
          setProgress(Math.round(percent * 0.3)); // 30% for reading
        },
        onChunk: async (rows, chunkIndex, isLast) => {
          if (chunkIndex === 0) {
            // First chunk - parse headers from first row if it's the raw header row
            // Note: useChunkedFileReader already extracts headers separately
          }
          
          // Build header map on first chunk
          if (Object.keys(headerMapRef.current).length === 0) {
            // Get headers from result
            const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));
            
            if (extension === ".csv") {
              // For CSV, headers were already extracted
              // We need to read the first line separately
              const text = await selectedFile.text();
              const firstLine = text.split(/\r?\n/)[0];
              const headers = parseCSVLine(firstLine);
              buildHeaderMap(headers);
            } else {
              // For XLSX, read headers
              const buffer = await selectedFile.arrayBuffer();
              const workbook = XLSX.read(buffer, { type: "array", sheetRows: 1 });
              const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
              const headerRow = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
              if (headerRow[0]) {
                buildHeaderMap(headerRow[0].map(h => String(h || "")));
              }
            }
          }

          setPhase("processing");
          setProgressText(`Processando lote ${chunkIndex + 1}...`);
          await processChunk(rows, chunkIndex, isLast);
          
          const percent = 30 + Math.round((currentRowRef.current / (rows.length * (chunkIndex + 1))) * 20);
          setProgress(Math.min(percent, 50));
        },
      });

      // Save to database
      await saveToDatabase();

    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error(`Erro: ${error.message}`);
      
      if (batchIdRef.current) {
        await supabase
          .from("baseoff_import_batches")
          .update({
            status: "failed",
            error_details: { message: error.message },
            completed_at: new Date().toISOString(),
          })
          .eq("id", batchIdRef.current);
      }

      setResult({ ...importResultRef.current });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === "," || char === ";") && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    return row;
  };

  const buildHeaderMap = (headers: string[]) => {
    headers.forEach((header, idx) => {
      const normalized = String(header || "")
        .toUpperCase()
        .trim()
        .replace(/[_\s]+/g, "")
        .replace(/[^A-Z0-9]/g, "");

      let dbField = COLUMN_MAP[normalized];
      
      if (!dbField) {
        for (const [variation, field] of Object.entries(COLUMN_MAP)) {
          const normalizedVar = variation
            .toUpperCase()
            .replace(/[_\s]+/g, "")
            .replace(/[^A-Z0-9]/g, "");
          if (normalizedVar === normalized) {
            dbField = field;
            break;
          }
        }
      }
      
      if (dbField) {
        headerMapRef.current[idx] = dbField;
      }
    });

    console.log("Mapeamento de colunas:", headerMapRef.current);
  };

  const getFileSizeDisplay = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "reading": return "Lendo arquivo";
      case "processing": return "Processando dados";
      case "saving": return "Salvando no banco";
      case "done": return "Concluído";
      default: return "Aguardando";
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Motor de Importação Otimizado
          </h1>
          <p className="text-sm text-muted-foreground">
            Importação de arquivos grandes com processamento em chunks
          </p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label>Tamanho do lote</Label>
              <Select
                value={String(batchSize)}
                onValueChange={(v) => setBatchSize(Number(v))}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="250">250 registros</SelectItem>
                  <SelectItem value="500">500 registros</SelectItem>
                  <SelectItem value="1000">1000 registros</SelectItem>
                  <SelectItem value="2000">2000 registros</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Lotes menores usam menos memória
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecionar Arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              selectedFile
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            } ${isProcessing ? "pointer-events-none opacity-50" : ""}`}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            {selectedFile ? (
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getFileSizeDisplay(selectedFile.size)}
                </p>
                {!isProcessing && (
                  <Button variant="link" className="mt-2">
                    Trocar arquivo
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium">Clique para selecionar um arquivo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos aceitos: CSV, XLSX, XLS (sem limite de tamanho)
                </p>
              </div>
            )}
          </div>

          {selectedFile && !isProcessing && !result && (
            <Button onClick={startImport} className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              Iniciar Importação Otimizada
            </Button>
          )}

          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <Badge variant="outline">{getPhaseLabel()}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{progressText}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                Clientes: {clientsBufferRef.current.size} | 
                Contratos: {processedContractsRef.current.size}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {result.errors === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{result.success}</p>
                <p className="text-sm text-muted-foreground">Clientes</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">{result.contractsDetected}</p>
                <p className="text-sm text-muted-foreground">Contratos</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{result.contractsInserted}</p>
                <p className="text-sm text-muted-foreground">Salvos</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <p className="text-2xl font-bold text-yellow-500">{result.duplicates}</p>
                <p className="text-sm text-muted-foreground">Duplicados</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <p className="text-2xl font-bold text-red-500">{result.errors}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>

            {result.errorDetails.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erros encontrados</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="h-32 mt-2">
                    {result.errorDetails.slice(0, 20).map((err, idx) => (
                      <p key={idx} className="text-sm">
                        Linha {err.row}: {err.error}
                      </p>
                    ))}
                    {result.errorDetails.length > 20 && (
                      <p className="text-sm font-medium mt-2">
                        ... e mais {result.errorDetails.length - 20} erros
                      </p>
                    )}
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
                setPhase("idle");
              }}
            >
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Sobre o Motor Otimizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>✓ Processa arquivos grandes sem travar o navegador</li>
            <li>✓ Leitura em chunks para economizar memória</li>
            <li>✓ Inserção em lotes para melhor performance</li>
            <li>✓ Suporte a CSV e XLSX sem limite de tamanho</li>
            <li>✓ Detecção automática de clientes e contratos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
