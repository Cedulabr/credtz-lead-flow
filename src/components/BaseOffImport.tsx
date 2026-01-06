import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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

// Mapeamento das colunas do arquivo para os campos do banco
const COLUMN_MAP: Record<string, string> = {
  // Campos básicos do cliente
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
  
  // RMC e RCC
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
  
  // === COLUNAS DE CONTRATO/EMPRÉSTIMO - ALIASES AMPLIADOS ===
  // Banco do empréstimo
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
  
  // Número do contrato
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
  
  // Valor do empréstimo
  VLEMPRESTIMO: "vl_emprestimo",
  "VL_EMPRESTIMO": "vl_emprestimo",
  "VL EMPRESTIMO": "vl_emprestimo",
  "VALOREMPRESTIMO": "vl_emprestimo",
  "VALOR_EMPRESTIMO": "vl_emprestimo",
  "VALOR EMPRESTIMO": "vl_emprestimo",
  "VLEMPRÉSTIMO": "vl_emprestimo",
  "VL_EMPRÉSTIMO": "vl_emprestimo",
  
  // Início do desconto
  INICIODODESCONTO: "inicio_desconto",
  "INICIO_DESCONTO": "inicio_desconto",
  "INICIO DESCONTO": "inicio_desconto",
  "INICIODESCONTO": "inicio_desconto",
  "DT_INICIO_DESCONTO": "inicio_desconto",
  "DATA_INICIO_DESCONTO": "inicio_desconto",
  
  // Prazo
  PRAZO: "prazo",
  "QT_PRAZO": "prazo",
  "QTPRAZO": "prazo",
  "PRAZO_TOTAL": "prazo",
  
  // Valor da parcela
  VLPARCELA: "vl_parcela",
  "VL_PARCELA": "vl_parcela",
  "VL PARCELA": "vl_parcela",
  "VALORPARCELA": "vl_parcela",
  "VALOR_PARCELA": "vl_parcela",
  "VALOR PARCELA": "vl_parcela",
  
  // Tipo de empréstimo (ex: 98, 13, etc.)
  TIPOEMPRESTIMO: "tipo_emprestimo",
  "TIPO_EMPRESTIMO": "tipo_emprestimo",
  "TIPO EMPRESTIMO": "tipo_emprestimo",
  "TIPOEMPRÉSTIMO": "tipo_emprestimo",
  "TIPO_EMPRÉSTIMO": "tipo_emprestimo",
  "CD_TIPO_EMPRESTIMO": "tipo_emprestimo",
  "CDTIPOEMPRESTIMO": "tipo_emprestimo",
  "TP_EMPRESTIMO": "tipo_emprestimo",
  "TPEMPRESTIMO": "tipo_emprestimo",
  
  // Data de averbação
  DATAAVERBACAO: "data_averbacao",
  "DATA_AVERBACAO": "data_averbacao",
  "DATA AVERBACAO": "data_averbacao",
  "DTAVERBACAO": "data_averbacao",
  "DT_AVERBACAO": "data_averbacao",
  
  // Situação do empréstimo
  SITUACAOEMPRESTIMO: "situacao_emprestimo",
  "SITUACAO_EMPRESTIMO": "situacao_emprestimo",
  "SITUACAO EMPRESTIMO": "situacao_emprestimo",
  "SITUACAOEMPRÉSTIMO": "situacao_emprestimo",
  "ST_EMPRESTIMO": "situacao_emprestimo",
  "STATUS_EMPRESTIMO": "situacao_emprestimo",
  
  // Competência
  COMPETENCIA: "competencia",
  "COMPETÊNCIA": "competencia",
  
  // Competência final
  COMPETENCIA_FINAL: "competencia_final",
  "COMPETENCIA FINAL": "competencia_final",
  "COMPETENCIAFINAL": "competencia_final",
  "COMPETÊNCIA_FINAL": "competencia_final",
  
  // Taxa
  TAXA: "taxa",
  "TX_JUROS": "taxa",
  "TXJUROS": "taxa",
  "TAXA_JUROS": "taxa",
  
  // Saldo
  SALDO: "saldo",
  "VL_SALDO": "saldo",
  "VLSALDO": "saldo",
  "SALDO_DEVEDOR": "saldo",
  
  // Endereço
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
  
  // Telefones
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
  
  // E-mails
  EMAIL_1: "email_1",
  EMAIL_2: "email_2",
  EMAIL_3: "email_3",
  "EMAIL 1": "email_1",
  "EMAIL 2": "email_2",
  "EMAIL 3": "email_3",
  "EMAIL1": "email_1",
  "EMAIL2": "email_2",
  "EMAIL3": "email_3",
  
  // Nome da mãe/pai e naturalidade
  NOME_MAE: "nome_mae",
  "NOMEMAE": "nome_mae",
  NOME_PAI: "nome_pai",
  "NOMEPAI": "nome_pai",
  NATURALIDADE: "naturalidade",
};

export function BaseOffImport({ onBack }: BaseOffImportProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    // Se for número (Excel date serial)
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

    // Formato DD/MM/YYYY
    const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
    }

    // Formato YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return dateStr;
    }

    // Formato YYYYMMDD
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

  // Função melhorada para CPF - preserva zeros à esquerda
  const cleanCPF = (cpfValue: any): string | null => {
    if (cpfValue === null || cpfValue === undefined) return null;
    
    // Converter para string, tratando números
    let cpfStr = String(cpfValue);
    
    // Remover caracteres não numéricos
    const clean = cpfStr.replace(/\D/g, "");
    
    if (clean.length === 0) return null;
    
    // Garantir que tem 11 dígitos, preenchendo com zeros à esquerda
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
    }
  };

  const readFileData = async (file: File): Promise<any[][]> => {
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    
    if (extension === ".csv") {
      const text = await file.text();
      return parseCSV(text);
    } else {
      // XLSX ou XLS
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Converter para array com header
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: "" });
      return jsonData as any[][];
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const result: string[][] = [];

    for (const line of lines) {
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
      result.push(row);
    }

    return result;
  };

  const processImport = async () => {
    if (!selectedFile || !user?.id) return;

    setIsImporting(true);
    setProgress(0);
    setResult(null);

    const importResult: ImportResult = {
      total: 0,
      success: 0,
      errors: 0,
      duplicates: 0,
      contractsDetected: 0,
      contractsInserted: 0,
      errorDetails: [],
    };

    try {
      // Criar lote de importação
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
      const batchId = batchData.id;

      // Ler arquivo
      setProgressText("Lendo arquivo...");
      const rows = await readFileData(selectedFile);

      if (rows.length < 2) {
        throw new Error("Arquivo vazio ou sem dados");
      }

      // Normalizar headers
      const headers = rows[0].map((h) => 
        String(h || "").toUpperCase().trim().replace(/[_\s]+/g, "").replace(/[^A-Z0-9]/g, "")
      );
      
      // Criar mapa de índice para campo
      const headerToDbField: Record<number, string> = {};
      headers.forEach((header, idx) => {
        // Tentar encontrar correspondência exata
        let dbField = COLUMN_MAP[header];
        
        // Se não encontrou, tentar com variações
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

      // Log de debug para identificar colunas não mapeadas
      const originalHeaders = rows[0].map((h) => String(h || "").trim());
      const unmappedColumns = originalHeaders.filter((h, idx) => !headerToDbField[idx] && h.length > 0);
      if (unmappedColumns.length > 0) {
        console.log("Colunas não mapeadas do arquivo:", unmappedColumns);
      }
      
      // Verificar se colunas de contrato foram mapeadas
      const mappedFields = Object.values(headerToDbField);
      const hasContractColumns = mappedFields.includes("contrato") && mappedFields.includes("banco_emprestimo");
      console.log("Colunas mapeadas:", mappedFields);
      console.log("Colunas de contrato encontradas:", hasContractColumns);

      const dataRows = rows.slice(1);
      importResult.total = dataRows.length;

      setProgressText(`Processando ${dataRows.length} registros...`);

      // Agrupar por CPF para processar clientes e contratos
      const clientsMap = new Map<string, any>();
      const contractsMap = new Map<string, any[]>();
      const processedContracts = new Set<string>(); // Para evitar duplicados

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowData: Record<string, any> = {};

        // Mapear colunas usando o mapa de índices
        Object.entries(headerToDbField).forEach(([idxStr, dbField]) => {
          const idx = parseInt(idxStr);
          if (row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== "") {
            rowData[dbField] = row[idx];
          }
        });

        const cpf = cleanCPF(rowData.cpf);
        if (!cpf) {
          importResult.errors++;
          importResult.errorDetails.push({
            row: i + 2,
            error: "CPF inválido ou ausente",
            data: rowData,
          });
          continue;
        }

        const nb = String(rowData.nb || "").trim();
        if (!nb) {
          importResult.errors++;
          importResult.errorDetails.push({
            row: i + 2,
            error: "NB ausente",
            data: rowData,
          });
          continue;
        }

        // Dados do cliente - só adiciona se ainda não existe
        if (!clientsMap.has(cpf)) {
          clientsMap.set(cpf, {
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
            imported_by: user.id,
            import_batch_id: batchId,
          });
        }

        // Dados do contrato (se houver)
        const contrato = rowData.contrato ? String(rowData.contrato).trim() : null;
        const bancoEmprestimo = rowData.banco_emprestimo ? String(rowData.banco_emprestimo).trim() : null;
        
        if (contrato && bancoEmprestimo) {
          const contractKey = `${cpf}-${contrato}`;
          
          // Verificar se já processamos este contrato (evitar duplicados)
          if (!processedContracts.has(contractKey)) {
            processedContracts.add(contractKey);
            
            if (!contractsMap.has(cpf)) {
              contractsMap.set(cpf, []);
            }

            contractsMap.get(cpf)!.push({
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
            importResult.duplicates++;
          }
        }

        setProgress(Math.round(((i + 1) / dataRows.length) * 50));
      }

      // Inserir/Atualizar clientes em lotes
      setProgressText("Salvando clientes...");
      const clientsArray = Array.from(clientsMap.values());
      const batchSize = 100;

      for (let i = 0; i < clientsArray.length; i += batchSize) {
        const batch = clientsArray.slice(i, i + batchSize);

        const { error } = await supabase.from("baseoff_clients").upsert(batch, {
          onConflict: "cpf",
          ignoreDuplicates: false,
        });

        if (error) {
          console.error("Erro ao inserir clientes:", error);
          batch.forEach((client, idx) => {
            importResult.errors++;
            importResult.errorDetails.push({
              row: i + idx + 2,
              error: error.message,
              data: client,
            });
          });
        } else {
          importResult.success += batch.length;
        }

        setProgress(50 + Math.round(((i + batchSize) / clientsArray.length) * 25));
      }

      // Buscar IDs dos clientes inseridos (em lotes para evitar limite de query/URL)
      setProgressText("Vinculando contratos...");
      const cpfList = Array.from(clientsMap.keys());
      const cpfToIdMap = new Map<string, string>();
      const cpfBatchSize = 1000;

      for (let i = 0; i < cpfList.length; i += cpfBatchSize) {
        const cpfBatch = cpfList.slice(i, i + cpfBatchSize);

        const { data: insertedClientsBatch, error: insertedClientsError } = await supabase
          .from("baseoff_clients")
          .select("id, cpf")
          .in("cpf", cpfBatch)
          .limit(cpfBatchSize);

        if (insertedClientsError) {
          console.error("Erro ao buscar IDs dos clientes:", insertedClientsError);
          importResult.errors++;
          importResult.errorDetails.push({
            row: 0,
            error: `Erro ao vincular contratos (buscar IDs de clientes): ${insertedClientsError.message}`,
          });
          continue;
        }

        insertedClientsBatch?.forEach((c) => cpfToIdMap.set(c.cpf, c.id));

        // Progresso: 50 -> 75 durante vínculo
        setProgress(50 + Math.round(((i + cpfBatch.length) / cpfList.length) * 25));
      }

      // Inserir contratos
      const allContracts: any[] = [];
      let cpfsSemId = 0;

      contractsMap.forEach((contracts, cpf) => {
        const clientId = cpfToIdMap.get(cpf);
        if (!clientId) {
          cpfsSemId++;
          return;
        }

        contracts.forEach((contract) => {
          allContracts.push({
            ...contract,
            client_id: clientId,
          });
        });
      });

      if (cpfsSemId > 0) {
        console.warn(`Não foi possível resolver o ID de ${cpfsSemId} CPFs para vínculo de contratos.`);
      }

      // Atualizar contagem de contratos detectados
      importResult.contractsDetected = allContracts.length;

      if (allContracts.length > 0) {
        setProgressText(`Salvando ${allContracts.length} contratos...`);

        for (let i = 0; i < allContracts.length; i += batchSize) {
          const batch = allContracts.slice(i, i + batchSize);

          const { error } = await supabase.from("baseoff_contracts").upsert(batch, {
            onConflict: "cpf,contrato",
            ignoreDuplicates: false,
          });

          if (error) {
            console.error("Erro ao inserir contratos:", error);
            importResult.errors++;
            importResult.errorDetails.push({
              row: 0,
              error: `Erro ao salvar contratos: ${error.message}`,
            });
          } else {
            importResult.contractsInserted += batch.length;
          }

          setProgress(75 + Math.round(((i + batchSize) / allContracts.length) * 25));
        }
      } else {
        // Log das colunas mapeadas para debug
        console.log("Nenhum contrato detectado. Colunas mapeadas:", Object.values(headerToDbField));
        console.log("Verificar se as colunas banco_emprestimo e contrato estão presentes");
      }

      // Atualizar lote de importação
      await supabase
        .from("baseoff_import_batches")
        .update({
          status: "completed",
          total_records: importResult.total,
          success_count: importResult.success,
          error_count: importResult.errors,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batchId);

      setProgress(100);
      setProgressText("Importação concluída!");
      setResult(importResult);
      toast.success(
        `Importação concluída! ${importResult.success} clientes e ${importResult.contractsInserted} contratos processados.`
      );
    } catch (error: any) {
      console.error("Erro na importação:", error);
      toast.error(`Erro na importação: ${error.message}`);
      importResult.errors++;
      importResult.errorDetails.push({
        row: 0,
        error: error.message,
      });
      setResult(importResult);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" />
            Importação de Base OFF
          </h1>
          <p className="text-sm text-muted-foreground">
            Importe dados de clientes e contratos via arquivo CSV ou XLSX
          </p>
        </div>
      </div>

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
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            {selectedFile ? (
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button variant="link" className="mt-2">
                  Trocar arquivo
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-medium">Clique para selecionar um arquivo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos aceitos: CSV, XLSX, XLS
                </p>
              </div>
            )}
          </div>

          {selectedFile && !isImporting && !result && (
            <Button onClick={processImport} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Iniciar Importação
            </Button>
          )}

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{progressText}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
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
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-sm text-muted-foreground">Total de Linhas</p>
              </div>
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <p className="text-2xl font-bold text-success">{result.success}</p>
                <p className="text-sm text-muted-foreground">Clientes Importados</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary">{result.contractsDetected}</p>
                <p className="text-sm text-muted-foreground">Contratos Detectados</p>
              </div>
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <p className="text-2xl font-bold text-success">{result.contractsInserted}</p>
                <p className="text-sm text-muted-foreground">Contratos Salvos</p>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <p className="text-2xl font-bold text-warning">{result.duplicates}</p>
                <p className="text-sm text-muted-foreground">Contratos Duplicados</p>
              </div>
            </div>

            {result.contractsDetected === 0 && result.success > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Nenhum contrato detectado</AlertTitle>
                <AlertDescription>
                  Verifique se o arquivo contém as colunas de contrato (BANCO_EMPRESTIMO, CONTRATO, TIPO_EMPRESTIMO, etc.). 
                  Os contratos tipo 98 (empréstimos) precisam dessas colunas para serem importados.
                </AlertDescription>
              </Alert>
            )}

            {result.errorDetails.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Detalhes dos Erros</h4>
                <ScrollArea className="h-48 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Linha</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errorDetails.slice(0, 100).map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell className="text-destructive">{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setResult(null);
                  setProgress(0);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Nova Importação
              </Button>
              <Button variant="outline" onClick={onBack}>
                Voltar para Consulta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instruções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Formatos Aceitos</AlertTitle>
            <AlertDescription>
              O arquivo pode estar no formato CSV, XLSX ou XLS. CPFs com zeros à esquerda
              serão preservados corretamente.
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="font-medium mb-2">Colunas obrigatórias:</h4>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">NB</Badge>
              <Badge variant="outline">CPF</Badge>
              <Badge variant="outline">NOME</Badge>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Regras de importação:</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>CPFs duplicados serão atualizados com os novos dados</li>
              <li>Contratos com mesmo CPF e número serão atualizados</li>
              <li>Contratos duplicados no mesmo arquivo são ignorados</li>
              <li>Um cliente pode ter múltiplos contratos</li>
              <li>Datas devem estar no formato DD/MM/YYYY ou YYYY-MM-DD</li>
              <li>Valores numéricos podem usar vírgula ou ponto como separador decimal</li>
              <li>CPFs com zeros à esquerda são tratados corretamente</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
