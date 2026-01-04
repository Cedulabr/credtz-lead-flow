import { useState, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  duplicates: number;
  errorDetails: Array<{ row: number; error: string; data?: any }>;
}

interface BaseOffImportProps {
  onBack: () => void;
}

// Mapeamento das colunas do CSV para os campos do banco
const CSV_COLUMN_MAP: Record<string, string> = {
  NB: "nb",
  CPF: "cpf",
  NOME: "nome",
  DTNASCIMENTO: "data_nascimento",
  ESP: "esp",
  DIB: "dib",
  MR: "mr",
  BANCOPAGTO: "banco_pagto",
  AGENCIAPAGTO: "agencia_pagto",
  ORGAOPAGADOR: "orgao_pagador",
  CONTACORRENTE: "conta_corrente",
  MEIOPAGTO: "meio_pagto",
  STATUSBENEFICIO: "status_beneficio",
  BLOQUEIO: "bloqueio",
  PENSAOALIMENTICIA: "pensao_alimenticia",
  REPRESENTANTE: "representante",
  SEXO: "sexo",
  DDB: "ddb",
  BANCORMC: "banco_rmc",
  VALORRMC: "valor_rmc",
  BANCORCC: "banco_rcc",
  VALORRCC: "valor_rcc",
  BANCOEMPRESTIMO: "banco_emprestimo",
  CONTRATO: "contrato",
  VLEMPRESTIMO: "vl_emprestimo",
  INICIODODESCONTO: "inicio_desconto",
  PRAZO: "prazo",
  VLPARCELA: "vl_parcela",
  TIPOEMPRESTIMO: "tipo_emprestimo",
  DATAAVERBACAO: "data_averbacao",
  SITUACAOEMPRESTIMO: "situacao_emprestimo",
  COMPETENCIA: "competencia",
  COMPETENCIA_FINAL: "competencia_final",
  TAXA: "taxa",
  SALDO: "saldo",
  BAIRRO: "bairro",
  MUNICIPIO: "municipio",
  UF: "uf",
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
  TelFixo_1: "tel_fixo_1",
  TelFixo_2: "tel_fixo_2",
  TelFixo_3: "tel_fixo_3",
  TelCel_1: "tel_cel_1",
  TelCel_2: "tel_cel_2",
  TelCel_3: "tel_cel_3",
  Email_1: "email_1",
  Email_2: "email_2",
  Email_3: "email_3",
};

export function BaseOffImport({ onBack }: BaseOffImportProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const parseDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr || dateStr.trim() === "") return null;
    const clean = dateStr.trim();

    // Formato DD/MM/YYYY
    const brMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }

    // Formato YYYY-MM-DD
    const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return clean;
    }

    // Formato YYYYMMDD
    const numMatch = clean.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (numMatch) {
      return `${numMatch[1]}-${numMatch[2]}-${numMatch[3]}`;
    }

    return null;
  };

  const parseNumber = (numStr: string | null | undefined): number | null => {
    if (!numStr || numStr.trim() === "") return null;
    const clean = numStr.replace(/[^\d,.-]/g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  const cleanCPF = (cpf: string | null | undefined): string | null => {
    if (!cpf) return null;
    const clean = cpf.replace(/\D/g, "");
    if (clean.length < 11) return clean.padStart(11, "0");
    return clean.slice(0, 11);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
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
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        throw new Error("Arquivo vazio ou sem dados");
      }

      const headers = rows[0].map((h) => h.toUpperCase().trim());
      const dataRows = rows.slice(1);
      importResult.total = dataRows.length;

      setProgressText(`Processando ${dataRows.length} registros...`);

      // Agrupar por CPF para processar clientes e contratos
      const clientsMap = new Map<string, any>();
      const contractsMap = new Map<string, any[]>();

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowData: Record<string, any> = {};

        // Mapear colunas
        headers.forEach((header, idx) => {
          const dbField = CSV_COLUMN_MAP[header];
          if (dbField && row[idx]) {
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

        const nb = rowData.nb?.trim();
        if (!nb) {
          importResult.errors++;
          importResult.errorDetails.push({
            row: i + 2,
            error: "NB ausente",
            data: rowData,
          });
          continue;
        }

        // Dados do cliente
        if (!clientsMap.has(cpf)) {
          clientsMap.set(cpf, {
            nb: nb,
            cpf: cpf,
            nome: rowData.nome || "Não informado",
            data_nascimento: parseDate(rowData.data_nascimento),
            sexo: rowData.sexo,
            esp: rowData.esp,
            dib: parseDate(rowData.dib),
            mr: parseNumber(rowData.mr),
            banco_pagto: rowData.banco_pagto,
            agencia_pagto: rowData.agencia_pagto,
            orgao_pagador: rowData.orgao_pagador,
            conta_corrente: rowData.conta_corrente,
            meio_pagto: rowData.meio_pagto,
            status_beneficio: rowData.status_beneficio,
            bloqueio: rowData.bloqueio,
            pensao_alimenticia: rowData.pensao_alimenticia,
            representante: rowData.representante,
            ddb: parseDate(rowData.ddb),
            banco_rmc: rowData.banco_rmc,
            valor_rmc: parseNumber(rowData.valor_rmc),
            banco_rcc: rowData.banco_rcc,
            valor_rcc: parseNumber(rowData.valor_rcc),
            bairro: rowData.bairro,
            municipio: rowData.municipio,
            uf: rowData.uf,
            cep: rowData.cep,
            endereco: rowData.endereco,
            logr_tipo_1: rowData.logr_tipo_1,
            logr_titulo_1: rowData.logr_titulo_1,
            logr_nome_1: rowData.logr_nome_1,
            logr_numero_1: rowData.logr_numero_1,
            logr_complemento_1: rowData.logr_complemento_1,
            bairro_1: rowData.bairro_1,
            cidade_1: rowData.cidade_1,
            uf_1: rowData.uf_1,
            cep_1: rowData.cep_1,
            tel_fixo_1: rowData.tel_fixo_1,
            tel_fixo_2: rowData.tel_fixo_2,
            tel_fixo_3: rowData.tel_fixo_3,
            tel_cel_1: rowData.tel_cel_1,
            tel_cel_2: rowData.tel_cel_2,
            tel_cel_3: rowData.tel_cel_3,
            email_1: rowData.email_1,
            email_2: rowData.email_2,
            email_3: rowData.email_3,
            imported_by: user.id,
            import_batch_id: batchId,
          });
        }

        // Dados do contrato (se houver)
        if (rowData.contrato && rowData.banco_emprestimo) {
          const contractKey = `${cpf}-${rowData.contrato}`;
          if (!contractsMap.has(cpf)) {
            contractsMap.set(cpf, []);
          }

          // Evitar duplicidade de contrato
          const existingContracts = contractsMap.get(cpf)!;
          if (!existingContracts.find((c) => c.contrato === rowData.contrato)) {
            existingContracts.push({
              cpf: cpf,
              banco_emprestimo: rowData.banco_emprestimo,
              contrato: rowData.contrato,
              vl_emprestimo: parseNumber(rowData.vl_emprestimo),
              inicio_desconto: parseDate(rowData.inicio_desconto),
              prazo: rowData.prazo ? parseInt(rowData.prazo) : null,
              vl_parcela: parseNumber(rowData.vl_parcela),
              tipo_emprestimo: rowData.tipo_emprestimo,
              data_averbacao: parseDate(rowData.data_averbacao),
              situacao_emprestimo: rowData.situacao_emprestimo,
              competencia: parseDate(rowData.competencia),
              competencia_final: parseDate(rowData.competencia_final),
              taxa: parseNumber(rowData.taxa),
              saldo: parseNumber(rowData.saldo),
            });
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

      // Buscar IDs dos clientes inseridos
      setProgressText("Vinculando contratos...");
      const cpfList = Array.from(clientsMap.keys());
      const { data: insertedClients } = await supabase
        .from("baseoff_clients")
        .select("id, cpf")
        .in("cpf", cpfList);

      const cpfToIdMap = new Map<string, string>();
      insertedClients?.forEach((c) => cpfToIdMap.set(c.cpf, c.id));

      // Inserir contratos
      const allContracts: any[] = [];
      contractsMap.forEach((contracts, cpf) => {
        const clientId = cpfToIdMap.get(cpf);
        if (clientId) {
          contracts.forEach((contract) => {
            allContracts.push({
              ...contract,
              client_id: clientId,
            });
          });
        }
      });

      if (allContracts.length > 0) {
        for (let i = 0; i < allContracts.length; i += batchSize) {
          const batch = allContracts.slice(i, i + batchSize);

          const { error } = await supabase.from("baseoff_contracts").upsert(batch, {
            onConflict: "cpf,contrato",
            ignoreDuplicates: false,
          });

          if (error) {
            console.error("Erro ao inserir contratos:", error);
          }

          setProgress(75 + Math.round(((i + batchSize) / allContracts.length) * 25));
        }
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
        `Importação concluída! ${importResult.success} clientes processados.`
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
            Importe dados de clientes e contratos via arquivo CSV
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
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile
                ? "border-primary/50 bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
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
                <p className="font-medium">Clique para selecionar um arquivo CSV</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou arraste e solte aqui
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <p className="text-2xl font-bold text-success">{result.success}</p>
                <p className="text-sm text-muted-foreground">Sucesso</p>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <p className="text-2xl font-bold text-warning">{result.duplicates}</p>
                <p className="text-sm text-muted-foreground">Duplicados</p>
              </div>
            </div>

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
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Formato do Arquivo</AlertTitle>
            <AlertDescription>
              O arquivo deve estar no formato CSV com as colunas separadas por vírgula ou
              ponto-e-vírgula.
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
              <li>Um cliente pode ter múltiplos contratos</li>
              <li>Datas devem estar no formato DD/MM/YYYY ou YYYY-MM-DD</li>
              <li>Valores numéricos podem usar vírgula ou ponto como separador decimal</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
