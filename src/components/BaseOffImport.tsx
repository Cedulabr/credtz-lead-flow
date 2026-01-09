import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
  Download,
  RefreshCw,
  FileSpreadsheet,
  Settings,
  Loader2,
  Database,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  duplicates: number;
  contractsDetected: number;
  contractsInserted: number;
  errorDetails: Array<{ row: number; error: string; data?: any }>;
}

interface BaseOffImportProps {
  onBack: () => void;
}

// Limites de importação - Suporte para arquivos grandes até 400MB
const IMPORT_LIMITS = {
  maxFileSize: 400 * 1024 * 1024, // 400MB - Limite máximo
  maxRows: 500000, // 500k linhas
  recommendedRows: 100000, // 100k linhas recomendado
  warningRows: 200000, // Alerta a partir de 200k
  // Tamanhos de chunk para leitura do arquivo (linhas por vez)
  chunkSize: {
    small: 500, // Mais estável, menos memória
    medium: 1000, // Balanceado
    large: 2000, // Mais rápido, mais memória
  },
  // Tamanhos de lote para envio ao banco de dados
  dbBatchSize: {
    small: 25, // Ultra seguro - para arquivos muito grandes
    medium: 50, // Recomendado para arquivos grandes
    large: 100, // Para arquivos menores
  },
  // Delay entre lotes para evitar sobrecarga
  batchDelay: {
    small: 100, // ms entre lotes
    medium: 50,
    large: 10,
  }
};

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
  "BANCO_EMPRÉSTIMO": "banco_emprestimo",
  "BANCO EMPRÉSTIMO": "banco_emprestimo",
  "CD_BANCO_EMPRESTIMO": "banco_emprestimo",
  "CDBANCO": "banco_emprestimo",
  "CD_BANCO": "banco_emprestimo",
  "CODIGOBANCO": "banco_emprestimo",
  "CODIGO_BANCO": "banco_emprestimo",
  CONTRATO: "contrato",
  "NR_CONTRATO": "contrato",
  "NRCONTRATO": "contrato",
  "NUMERO_CONTRATO": "contrato",
  "NUMEROCONTRATO": "contrato",
  "NUM_CONTRATO": "contrato",
  "NUMCONTRATO": "contrato",
  "ID_CONTRATO": "contrato",
  "IDCONTRATO": "contrato",
  "CD_CONTRATO": "contrato",
  "CDCONTRATO": "contrato",
  "CONTRATO_NUMERO": "contrato",
  VLEMPRESTIMO: "vl_emprestimo",
  "VL_EMPRESTIMO": "vl_emprestimo",
  "VL EMPRESTIMO": "vl_emprestimo",
  "VALOREMPRESTIMO": "vl_emprestimo",
  "VALOR_EMPRESTIMO": "vl_emprestimo",
  "VALOR EMPRESTIMO": "vl_emprestimo",
  "VLEMPRÉSTIMO": "vl_emprestimo",
  "VL_EMPRÉSTIMO": "vl_emprestimo",
  INICIODODESCONTO: "inicio_desconto",
  "INICIO_DESCONTO": "inicio_desconto",
  "INICIO DESCONTO": "inicio_desconto",
  "INICIODESCONTO": "inicio_desconto",
  "DT_INICIO_DESCONTO": "inicio_desconto",
  "DATA_INICIO_DESCONTO": "inicio_desconto",
  PRAZO: "prazo",
  "QT_PRAZO": "prazo",
  "QTPRAZO": "prazo",
  "PRAZO_TOTAL": "prazo",
  VLPARCELA: "vl_parcela",
  "VL_PARCELA": "vl_parcela",
  "VL PARCELA": "vl_parcela",
  "VALORPARCELA": "vl_parcela",
  "VALOR_PARCELA": "vl_parcela",
  "VALOR PARCELA": "vl_parcela",
  TIPOEMPRESTIMO: "tipo_emprestimo",
  "TIPO_EMPRESTIMO": "tipo_emprestimo",
  "TIPO EMPRESTIMO": "tipo_emprestimo",
  "TIPOEMPRÉSTIMO": "tipo_emprestimo",
  "TIPO_EMPRÉSTIMO": "tipo_emprestimo",
  "CD_TIPO_EMPRESTIMO": "tipo_emprestimo",
  "CDTIPOEMPRESTIMO": "tipo_emprestimo",
  "TP_EMPRESTIMO": "tipo_emprestimo",
  "TPEMPRESTIMO": "tipo_emprestimo",
  DATAAVERBACAO: "data_averbacao",
  "DATA_AVERBACAO": "data_averbacao",
  "DATA AVERBACAO": "data_averbacao",
  "DTAVERBACAO": "data_averbacao",
  "DT_AVERBACAO": "data_averbacao",
  SITUACAOEMPRESTIMO: "situacao_emprestimo",
  "SITUACAO_EMPRESTIMO": "situacao_emprestimo",
  "SITUACAO EMPRESTIMO": "situacao_emprestimo",
  "SITUACAOEMPRÉSTIMO": "situacao_emprestimo",
  "ST_EMPRESTIMO": "situacao_emprestimo",
  "STATUS_EMPRESTIMO": "situacao_emprestimo",
  COMPETENCIA: "competencia",
  "COMPETÊNCIA": "competencia",
  COMPETENCIA_FINAL: "competencia_final",
  "COMPETENCIA FINAL": "competencia_final",
  "COMPETENCIAFINAL": "competencia_final",
  "COMPETÊNCIA_FINAL": "competencia_final",
  TAXA: "taxa",
  "TX_JUROS": "taxa",
  "TXJUROS": "taxa",
  "TAXA_JUROS": "taxa",
  SALDO: "saldo",
  "VL_SALDO": "saldo",
  "VLSALDO": "saldo",
  "SALDO_DEVEDOR": "saldo",
  BAIRRO: "bairro",
  MUNICIPIO: "municipio",
  "CIDADE": "municipio",
  UF: "uf",
  "ESTADO": "uf",
  CEP: "cep",
  ENDERECO: "endereco",
  "ENDEREÇO": "endereco",
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
  "TELCEL 1": "tel_cel_1",
  "TELCEL 2": "tel_cel_2",
  "TELCEL 3": "tel_cel_3",
  "TELFIXO 1": "tel_fixo_1",
  "TELFIXO 2": "tel_fixo_2",
  "TELFIXO 3": "tel_fixo_3",
  "TEL_CEL_1": "tel_cel_1",
  "TEL_CEL_2": "tel_cel_2",
  "TEL_CEL_3": "tel_cel_3",
  "TEL_FIXO_1": "tel_fixo_1",
  "TEL_FIXO_2": "tel_fixo_2",
  "TEL_FIXO_3": "tel_fixo_3",
  "TELEFONE1": "tel_cel_1",
  "TELEFONE2": "tel_cel_2",
  "TELEFONE3": "tel_cel_3",
  "TELEFONE_1": "tel_cel_1",
  "TELEFONE_2": "tel_cel_2",
  "TELEFONE_3": "tel_cel_3",
  EMAIL_1: "email_1",
  EMAIL_2: "email_2",
  EMAIL_3: "email_3",
  "EMAIL 1": "email_1",
  "EMAIL 2": "email_2",
  "EMAIL 3": "email_3",
  "EMAIL1": "email_1",
  "EMAIL2": "email_2",
  "EMAIL3": "email_3",
  NOME_MAE: "nome_mae",
  "NOMEMAE": "nome_mae",
  NOME_PAI: "nome_pai",
  "NOMEPAI": "nome_pai",
  NATURALIDADE: "naturalidade",
};

type ImportPhase = "idle" | "reading" | "processing" | "saving_clients" | "saving_contracts" | "done" | "error";

export function BaseOffImport({ onBack }: BaseOffImportProps) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ size: string; rows: number } | null>(null);
  const [batchSizeOption, setBatchSizeOption] = useState<"small" | "medium" | "large">("medium");
  
  // Refs para processamento em streaming
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

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    if (typeof dateValue === "number") {
      const date = XLSX.SSF.parse_date_code(dateValue);
      if (date) {
        const year = date.y;
        const month = String(date.m).padStart(2, "0");
        const day = String(date.d).padStart(2, "0");
        return `${year}-${month}-${day}`;
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
    if (isoMatch) {
      return dateStr;
    }

    const numMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (numMatch) {
      return `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}`;
    }

    return null;
  };

  const parseNumber = (numValue: any): number | null => {
    if (numValue === null || numValue === undefined) return null;
    
    if (typeof numValue === "number") {
      return isNaN(numValue) ? null : numValue;
    }
    
    const numStr = String(numValue).trim();
    if (numStr === "") return null;
    
    const clean = numStr.replace(/[^\d,.-]/g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  const cleanCPF = (cpfValue: any): string | null => {
    if (cpfValue === null || cpfValue === undefined) return null;
    
    let cpfStr = String(cpfValue);
    const clean = cpfStr.replace(/\D/g, "");
    
    if (clean.length === 0) return null;
    
    return clean.padStart(11, "0").slice(0, 11);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    
    if (!validExtensions.includes(fileExtension)) {
      toast.error("Formato inválido. Use arquivos CSV ou XLSX.");
      return;
    }
    
    if (file.size > IMPORT_LIMITS.maxFileSize) {
      toast.error(`Arquivo muito grande. Tamanho máximo: ${formatFileSize(IMPORT_LIMITS.maxFileSize)}`);
      return;
    }
    
    setSelectedFile(file);
    setResult(null);
    setPhase("idle");
    setFileInfo({ size: formatFileSize(file.size), rows: 0 });
    
    // Resetar buffers
    resetBuffers();
    
    // Estimar número de linhas - para arquivos grandes, usar estimativa por tamanho
    try {
      setProgressText("Analisando arquivo...");
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      let estimatedRows = 0;
      
      // Para arquivos maiores que 50MB, estimar por tamanho ao invés de ler todo
      const isLargeFile = file.size > 50 * 1024 * 1024;
      
      if (extension === ".csv") {
        if (isLargeFile) {
          // Estimar: ~100 bytes por linha em média para CSV
          estimatedRows = Math.round(file.size / 100);
        } else {
          const text = await file.text();
          estimatedRows = text.split(/\r?\n/).filter(l => l.trim()).length - 1;
        }
      } else {
        if (isLargeFile) {
          // Estimar: ~150 bytes por linha em média para XLSX
          estimatedRows = Math.round(file.size / 150);
        } else {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array", sheetRows: 1 });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Re-read para contar linhas reais
          const fullWorkbook = XLSX.read(buffer, { type: "array", sheetRows: 0 });
          const fullSheet = fullWorkbook.Sheets[fullWorkbook.SheetNames[0]];
          const fullRange = XLSX.utils.decode_range(fullSheet["!ref"] || "A1");
          estimatedRows = fullRange.e.r;
        }
      }
      
      setFileInfo({ size: formatFileSize(file.size), rows: estimatedRows });
      
      // Configurar automaticamente tamanho de lote para arquivos muito grandes
      if (estimatedRows > IMPORT_LIMITS.warningRows) {
        setBatchSizeOption("small");
        toast.warning(
          `Arquivo muito grande (~${estimatedRows.toLocaleString()} linhas). Lote "Ultra Seguro" selecionado automaticamente.`,
          { duration: 5000 }
        );
      } else if (estimatedRows > IMPORT_LIMITS.recommendedRows) {
        setBatchSizeOption("small");
        toast.info(
          `Arquivo grande (~${estimatedRows.toLocaleString()} linhas). Lote "Pequeno" recomendado.`,
          { duration: 4000 }
        );
      } else if (estimatedRows > IMPORT_LIMITS.maxRows) {
        toast.error(
          `Arquivo excede o limite de ${IMPORT_LIMITS.maxRows.toLocaleString()} linhas. Por favor, divida o arquivo.`
        );
        setSelectedFile(null);
        return;
      }
      
      setProgressText("");
    } catch (error) {
      console.error("Erro ao analisar arquivo:", error);
      // Estimar por tamanho em caso de erro
      const estimatedRows = Math.round(file.size / 120);
      setFileInfo({ size: formatFileSize(file.size), rows: estimatedRows });
      
      if (estimatedRows > IMPORT_LIMITS.warningRows) {
        setBatchSizeOption("small");
      }
    }
  };

  const resetBuffers = () => {
    clientsBufferRef.current.clear();
    contractsBufferRef.current.clear();
    processedContractsRef.current.clear();
    headerMapRef.current = {};
    importResultRef.current = {
      total: 0,
      success: 0,
      errors: 0,
      duplicates: 0,
      contractsDetected: 0,
      contractsInserted: 0,
      errorDetails: [],
    };
    batchIdRef.current = null;
    abortRef.current = false;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processRowData = (row: any[], headerMap: Record<number, string>, rowIndex: number) => {
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
      if (importResultRef.current.errorDetails.length < 100) {
        importResultRef.current.errorDetails.push({
          row: rowIndex + 2,
          error: "CPF inválido ou ausente",
        });
      }
      return;
    }

    const nb = String(rowData.nb || "").trim();
    if (!nb) {
      importResultRef.current.errors++;
      if (importResultRef.current.errorDetails.length < 100) {
        importResultRef.current.errorDetails.push({
          row: rowIndex + 2,
          error: "NB ausente",
        });
      }
      return;
    }

    // Adiciona cliente se não existir no buffer
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

    // Processa contrato se houver
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
  };

  const processImport = async () => {
    if (!selectedFile || !user?.id) return;

    if (fileInfo && fileInfo.rows > IMPORT_LIMITS.maxRows) {
      toast.error(`Arquivo excede o limite de ${IMPORT_LIMITS.maxRows.toLocaleString()} linhas. Divida o arquivo em partes menores.`);
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setResult(null);
    resetBuffers();

    const chunkSize = IMPORT_LIMITS.chunkSize[batchSizeOption];
    const dbBatchSize = IMPORT_LIMITS.dbBatchSize[batchSizeOption];

    try {
      // Criar lote de importação
      setPhase("reading");
      setProgressText("Criando lote de importação...");
      
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

      // Ler arquivo
      setProgressText("Lendo arquivo...");
      const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf("."));
      
      let headers: string[] = [];
      let dataRows: any[][] = [];

      if (extension === ".csv") {
        const text = await selectedFile.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        
        if (lines.length < 2) throw new Error("Arquivo vazio ou sem dados");
        
        // Parse header
        headers = parseCSVLine(lines[0]);
        
        // Parse data em chunks
        setPhase("processing");
        for (let i = 1; i < lines.length; i += chunkSize) {
          if (abortRef.current) break;
          
          const chunkEnd = Math.min(i + chunkSize, lines.length);
          for (let j = i; j < chunkEnd; j++) {
            dataRows.push(parseCSVLine(lines[j]));
          }
          
          const percent = Math.round((i / lines.length) * 30);
          setProgress(percent);
          setProgressText(`Lendo CSV: ${i.toLocaleString()}/${(lines.length - 1).toLocaleString()} linhas`);
          
          await delay(0); // Yield to UI
        }
      } else {
        // XLSX/XLS - ler em chunks
        const buffer = await selectedFile.arrayBuffer();
        setProgress(10);
        
        const workbook = XLSX.read(buffer, { 
          type: "array", 
          cellDates: true, 
          raw: false 
        });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(firstSheet["!ref"] || "A1");
        const totalRows = range.e.r;
        
        if (totalRows < 1) throw new Error("Arquivo vazio ou sem dados");

        // Extract headers
        const headerRow = XLSX.utils.sheet_to_json(firstSheet, { 
          header: 1, 
          raw: false, 
          defval: "",
          range: { s: { r: 0, c: 0 }, e: { r: 0, c: range.e.c } }
        }) as any[][];
        
        headers = headerRow[0]?.map(h => String(h || "").trim()) || [];

        // Extract data em chunks
        setPhase("processing");
        for (let startRow = 1; startRow <= totalRows; startRow += chunkSize) {
          if (abortRef.current) break;
          
          const endRow = Math.min(startRow + chunkSize - 1, totalRows);
          
          const chunkData = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            raw: false,
            defval: "",
            range: { s: { r: startRow, c: 0 }, e: { r: endRow, c: range.e.c } }
          }) as any[][];
          
          dataRows.push(...chunkData);
          
          const percent = 10 + Math.round((startRow / totalRows) * 20);
          setProgress(percent);
          setProgressText(`Lendo Excel: ${startRow.toLocaleString()}/${totalRows.toLocaleString()} linhas`);
          
          await delay(0);
        }
      }

      // Normalizar headers e criar mapa
      const normalizedHeaders = headers.map((h) => 
        String(h || "").toUpperCase().trim().replace(/[_\s]+/g, "").replace(/[^A-Z0-9]/g, "")
      );
      
      const headerToDbField: Record<number, string> = {};
      normalizedHeaders.forEach((header, idx) => {
        let dbField = COLUMN_MAP[header];
        
        if (!dbField) {
          const variations = Object.keys(COLUMN_MAP);
          for (const variation of variations) {
            const normalizedVariation = variation.toUpperCase().replace(/[_\s]+/g, "").replace(/[^A-Z0-9]/g, "");
            if (normalizedVariation === header) {
              dbField = COLUMN_MAP[variation];
              break;
            }
          }
        }
        
        if (dbField) {
          headerToDbField[idx] = dbField;
        }
      });

      headerMapRef.current = headerToDbField;
      importResultRef.current.total = dataRows.length;

      // Processar linhas em chunks
      setProgressText(`Processando ${dataRows.length.toLocaleString()} registros...`);
      
      for (let i = 0; i < dataRows.length; i += chunkSize) {
        if (abortRef.current) break;
        
        const chunkEnd = Math.min(i + chunkSize, dataRows.length);
        for (let j = i; j < chunkEnd; j++) {
          processRowData(dataRows[j], headerToDbField, j);
        }
        
        const percent = 30 + Math.round(((i + chunkSize) / dataRows.length) * 20);
        setProgress(Math.min(percent, 50));
        setProgressText(`Processando: ${Math.min(i + chunkSize, dataRows.length).toLocaleString()}/${dataRows.length.toLocaleString()} linhas`);
        
        await delay(0);
      }

      // Liberar memória do dataRows
      dataRows = [];

      // Salvar clientes em lotes
      setPhase("saving_clients");
      setProgressText("Salvando clientes no banco de dados...");
      
      const clientsArray = Array.from(clientsBufferRef.current.values());
      let savedClients = 0;

      for (let i = 0; i < clientsArray.length; i += dbBatchSize) {
        if (abortRef.current) break;
        
        const batch = clientsArray.slice(i, i + dbBatchSize);

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

        const percent = 50 + Math.round((savedClients / clientsArray.length) * 20);
        setProgress(percent);
        setProgressText(`Salvando clientes: ${savedClients.toLocaleString()}/${clientsArray.length.toLocaleString()}`);
        
        // Delay configurável para não sobrecarregar o banco
        await delay(IMPORT_LIMITS.batchDelay[batchSizeOption]);
      }

      // Buscar IDs dos clientes para vincular contratos
      setProgressText("Vinculando contratos...");
      const cpfList = Array.from(clientsBufferRef.current.keys());
      const cpfToIdMap = new Map<string, string>();

      for (let i = 0; i < cpfList.length; i += 1000) {
        if (abortRef.current) break;
        
        const cpfBatch = cpfList.slice(i, i + 1000);

        const { data: clientsBatch } = await supabase
          .from("baseoff_clients")
          .select("id, cpf")
          .in("cpf", cpfBatch)
          .limit(1000);

        clientsBatch?.forEach((c) => cpfToIdMap.set(c.cpf, c.id));
        
        await delay(10);
      }

      // Preparar contratos com client_id
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

      // Salvar contratos em lotes
      if (allContracts.length > 0) {
        setPhase("saving_contracts");
        setProgressText(`Salvando ${allContracts.length.toLocaleString()} contratos...`);
        let savedContracts = 0;

        for (let i = 0; i < allContracts.length; i += dbBatchSize) {
          if (abortRef.current) break;
          
          const batch = allContracts.slice(i, i + dbBatchSize);

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

          const percent = 70 + Math.round((savedContracts / allContracts.length) * 25);
          setProgress(percent);
          setProgressText(`Salvando contratos: ${savedContracts.toLocaleString()}/${allContracts.length.toLocaleString()}`);
          
          await delay(IMPORT_LIMITS.batchDelay[batchSizeOption]);
        }
      }

      // Atualizar lote de importação
      await supabase
        .from("baseoff_import_batches")
        .update({
          status: abortRef.current ? "cancelled" : "completed",
          total_records: importResultRef.current.total,
          success_count: importResultRef.current.success,
          error_count: importResultRef.current.errors,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchIdRef.current);

      // Registrar log de importação
      let companyId: string | null = null;
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (userCompany?.company_id) {
        companyId = userCompany.company_id;
      }
      
      await supabase.from('import_logs').insert({
        module: 'baseoff_clients',
        file_name: selectedFile.name,
        total_records: importResultRef.current.total,
        success_count: importResultRef.current.success,
        error_count: importResultRef.current.errors,
        duplicate_count: importResultRef.current.duplicates,
        status: abortRef.current ? 'cancelled' : 'completed',
        imported_by: user.id,
        company_id: companyId,
      });

      setProgress(100);
      setPhase("done");
      setProgressText("Importação concluída!");
      setResult({ ...importResultRef.current });
      
      if (abortRef.current) {
        toast.warning("Importação cancelada pelo usuário.");
      } else {
        toast.success(
          `Importação concluída! ${importResultRef.current.success.toLocaleString()} clientes e ${importResultRef.current.contractsInserted.toLocaleString()} contratos processados.`
        );
      }
    } catch (error: any) {
      console.error("Erro na importação:", error);
      setPhase("error");
      toast.error(`Erro na importação: ${error.message}`);
      importResultRef.current.errors++;
      importResultRef.current.errorDetails.push({
        row: 0,
        error: error.message,
      });
      setResult({ ...importResultRef.current });
      
      // Registrar log de erro
      if (user?.id) {
        const { data: userCompanyErr } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();
        
        await supabase.from('import_logs').insert({
          module: 'baseoff_clients',
          file_name: selectedFile.name,
          total_records: importResultRef.current.total,
          success_count: importResultRef.current.success,
          error_count: importResultRef.current.errors,
          duplicate_count: importResultRef.current.duplicates,
          status: 'error',
          imported_by: user.id,
          company_id: userCompanyErr?.company_id || null,
          error_message: error.message,
        });
      }

      if (batchIdRef.current) {
        await supabase
          .from("baseoff_import_batches")
          .update({
            status: "error",
            error_count: importResultRef.current.errors,
            completed_at: new Date().toISOString(),
          })
          .eq("id", batchIdRef.current);
      }
    } finally {
      setIsImporting(false);
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

  const handleAbort = () => {
    abortRef.current = true;
    toast.info("Cancelando importação...");
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "reading": return "Lendo arquivo";
      case "processing": return "Processando dados";
      case "saving_clients": return "Salvando clientes";
      case "saving_contracts": return "Salvando contratos";
      case "done": return "Concluído";
      case "error": return "Erro";
      default: return "Aguardando";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Importar Base Off</h2>
          <p className="text-sm text-muted-foreground">
            Importe arquivos CSV ou XLSX de até 400MB com dados de clientes e contratos
          </p>
        </div>
      </div>

      {/* Alerta para arquivos grandes */}
      <Alert className="border-amber-200 bg-amber-50/50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Importação de Arquivos Grandes</AlertTitle>
        <AlertDescription className="text-amber-700 text-sm space-y-1">
          <p>Para arquivos acima de 100MB ou 150 mil linhas:</p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>Selecione o modo <strong>"Ultra Seguro"</strong> antes de iniciar</li>
            <li>O processo pode levar de 5 a 30 minutos dependendo do tamanho</li>
            <li>Não feche a janela durante a importação</li>
            <li>Os dados são enviados em pequenos lotes para evitar sobrecarga</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Limites e Configurações */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-blue-800">
            <Settings className="h-4 w-4" />
            Limites e Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Tamanho máximo</p>
              <p className="font-medium">{formatFileSize(IMPORT_LIMITS.maxFileSize)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Linhas máximas</p>
              <p className="font-medium">{IMPORT_LIMITS.maxRows.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Recomendado</p>
              <p className="font-medium">{IMPORT_LIMITS.recommendedRows.toLocaleString()} linhas</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Formatos aceitos</p>
              <p className="font-medium">CSV, XLSX, XLS</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end pt-2 border-t">
            <div className="space-y-2 flex-1">
              <Label htmlFor="batchSize">Tamanho do lote (para arquivos grandes)</Label>
              <Select value={batchSizeOption} onValueChange={(v: any) => setBatchSizeOption(v)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Ultra Seguro (arquivos 200k+ linhas)
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Pequeno (arquivos 50k-200k linhas)
                    </div>
                  </SelectItem>
                  <SelectItem value="large">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Rápido (arquivos até 50k linhas)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Ultra Seguro:</strong> Lotes de {IMPORT_LIMITS.dbBatchSize.small} registros - ideal para arquivos de 200k+ linhas ou 400MB</p>
              <p><strong>Pequeno:</strong> Lotes de {IMPORT_LIMITS.dbBatchSize.medium} registros - para arquivos de 50k a 200k linhas</p>
              <p><strong>Rápido:</strong> Lotes de {IMPORT_LIMITS.dbBatchSize.large} registros - para arquivos menores</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload de Arquivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Selecionar Arquivo
          </CardTitle>
          <CardDescription>
            Selecione um arquivo CSV ou Excel com os dados da base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => !isImporting && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isImporting}
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                {fileInfo && (
                  <div className="flex gap-4 justify-center text-sm text-muted-foreground">
                    <span>Tamanho: {fileInfo.size}</span>
                    {fileInfo.rows > 0 && (
                      <span>Linhas: {fileInfo.rows.toLocaleString()}</span>
                    )}
                  </div>
                )}
                {!isImporting && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFileInfo(null); }}>
                    Remover
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Clique para selecionar ou arraste um arquivo
                </p>
                <p className="text-xs text-muted-foreground">
                  CSV, XLSX ou XLS (máx. {formatFileSize(IMPORT_LIMITS.maxFileSize)})
                </p>
              </div>
            )}
          </div>

          {/* Avisos do arquivo */}
          {fileInfo && fileInfo.rows > IMPORT_LIMITS.recommendedRows && (
            <Alert variant={fileInfo.rows > IMPORT_LIMITS.maxRows ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {fileInfo.rows > IMPORT_LIMITS.maxRows ? "Arquivo muito grande" : "Arquivo grande detectado"}
              </AlertTitle>
              <AlertDescription>
                {fileInfo.rows > IMPORT_LIMITS.maxRows ? (
                  <>
                    Este arquivo tem {fileInfo.rows.toLocaleString()} linhas, excedendo o limite de {IMPORT_LIMITS.maxRows.toLocaleString()}.
                    Por favor, divida o arquivo em partes menores.
                  </>
                ) : (
                  <>
                    Este arquivo tem {fileInfo.rows.toLocaleString()} linhas. 
                    Recomendamos usar o tamanho de lote "Pequeno" para maior estabilidade.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              onClick={processImport}
              disabled={!selectedFile || isImporting || (fileInfo && fileInfo.rows > IMPORT_LIMITS.maxRows)}
              className="flex-1"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Iniciar Importação
                </>
              )}
            </Button>
            
            {isImporting && (
              <Button variant="destructive" onClick={handleAbort}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progresso */}
      {isImporting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <Badge variant="outline">{getPhaseLabel()}</Badge>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground text-center">{progressText}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{importResultRef.current.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{importResultRef.current.success.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Clientes salvos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{importResultRef.current.contractsInserted.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Contratos salvos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{importResultRef.current.errors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {result && !isImporting && (
        <Card className={result.errors > 0 ? "border-yellow-200" : "border-green-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.errors > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold">{result.total.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total de linhas</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{result.success.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Clientes importados</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{result.contractsInserted.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Contratos importados</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{result.errors.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>

            {result.duplicates > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {result.duplicates.toLocaleString()} contratos duplicados foram ignorados.
                </AlertDescription>
              </Alert>
            )}

            {result.errorDetails.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Detalhes dos erros (primeiros 100):</h4>
                <ScrollArea className="h-40 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Linha</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errorDetails.slice(0, 100).map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell className="text-red-600">{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setResult(null); setSelectedFile(null); setFileInfo(null); }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Nova Importação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
