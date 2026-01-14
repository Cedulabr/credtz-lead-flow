import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = "https://qwgsplcqyongfsqdjrme.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const BATCH_SIZE = 1000;
const CHUNK_SIZE = 30000; // Process 30k rows per invocation to stay within timeout

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { job_id, continue_from_offset } = await req.json();

    if (!job_id) {
      throw new Error("job_id é obrigatório");
    }

    // Get job info
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job não encontrado: ${jobError?.message}`);
    }

    // Update job status to processing
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'processing',
        processing_started_at: job.processing_started_at || new Date().toISOString()
      })
      .eq('id', job_id);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('imports')
      .download(job.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Erro ao baixar arquivo: ${downloadError?.message}`);
    }

    const fileText = await fileData.text();
    const isCSV = job.file_name.toLowerCase().endsWith('.csv');
    
    let rows: string[][] = [];
    let headers: string[] = [];
    
    if (isCSV) {
      // Parse CSV
      const lines = fileText.split(/\r?\n/).filter(line => line.trim());
      headers = parseCSVLine(lines[0]);
      rows = lines.slice(1).map(line => parseCSVLine(line));
    } else {
      // For XLSX, we need to use a different approach
      // Since XLSX parsing is complex, we'll handle CSV primarily
      // and recommend converting XLSX to CSV for large files
      throw new Error("Para arquivos muito grandes, converta para CSV antes de importar");
    }

    const totalRows = rows.length;
    const startOffset = continue_from_offset || job.last_processed_offset || 0;
    const endOffset = Math.min(startOffset + CHUNK_SIZE, totalRows);
    
    // Build header map
    const headerMap = buildHeaderMap(headers);
    
    const clientsBuffer: any[] = [];
    const contractsBuffer: any[] = [];
    const errorLog: any[] = job.error_log || [];
    
    let processedInThisChunk = 0;

    // Process rows from offset
    for (let i = startOffset; i < endOffset; i++) {
      const row = rows[i];
      try {
        const { client, contract } = processRow(row, headerMap, headers);
        
        if (client && client.cpf) {
          clientsBuffer.push(client);
        }
        if (contract && contract.cpf) {
          contractsBuffer.push(contract);
        }
        
        // Save buffers when reaching batch size
        if (clientsBuffer.length >= BATCH_SIZE) {
          await saveToDatabase(supabase, clientsBuffer, contractsBuffer);
          clientsBuffer.length = 0;
          contractsBuffer.length = 0;
        }
        
        processedInThisChunk++;
      } catch (rowError) {
        errorLog.push({
          line: i + 2,
          error: rowError instanceof Error ? rowError.message : String(rowError),
          timestamp: new Date().toISOString()
        });
      }
      
      // Update progress every 1000 rows
      if (processedInThisChunk % 1000 === 0) {
        await supabase
          .from('import_jobs')
          .update({
            processed_rows: startOffset + processedInThisChunk,
            total_rows: totalRows,
            last_processed_offset: startOffset + processedInThisChunk,
            error_log: errorLog.slice(-100) // Keep last 100 errors
          })
          .eq('id', job_id);
      }
    }
    
    // Save remaining buffers
    if (clientsBuffer.length > 0 || contractsBuffer.length > 0) {
      await saveToDatabase(supabase, clientsBuffer, contractsBuffer);
    }
    
    const finalProcessed = startOffset + processedInThisChunk;
    const isComplete = endOffset >= totalRows;
    
    // Update final status
    await supabase
      .from('import_jobs')
      .update({
        status: isComplete ? 'completed' : 'chunk_completed',
        processed_rows: finalProcessed,
        total_rows: totalRows,
        last_processed_offset: endOffset,
        error_log: errorLog.slice(-100),
        processing_ended_at: isComplete ? new Date().toISOString() : null,
        chunk_metadata: {
          last_chunk_end: endOffset,
          rows_remaining: totalRows - endOffset,
          next_offset: endOffset
        }
      })
      .eq('id', job_id);

    return new Response(JSON.stringify({
      success: true,
      job_id,
      processed_in_chunk: processedInThisChunk,
      total_processed: finalProcessed,
      total_rows: totalRows,
      is_complete: isComplete,
      next_offset: isComplete ? null : endOffset,
      errors_count: errorLog.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing import:', error);
    
    // Try to update job status to failed
    try {
      const { job_id } = await req.json().catch(() => ({}));
      if (job_id) {
        await supabase
          .from('import_jobs')
          .update({
            status: 'failed',
            error_log: [{ error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() }],
            processing_ended_at: new Date().toISOString()
          })
          .eq('id', job_id);
      }
    } catch (_) {}
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function parseCSVLine(line: string): string[] {
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
}

function buildHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  const columnMap: Record<string, string[]> = {
    'cpf': ['cpf', 'cpf_cliente', 'cpf cliente', 'nr_cpf', 'numero_cpf'],
    'nome': ['nome', 'nome_cliente', 'nome cliente', 'nm_cliente', 'cliente'],
    'telefone1': ['telefone', 'telefone1', 'tel1', 'fone', 'celular', 'phone'],
    'telefone2': ['telefone2', 'tel2', 'fone2', 'celular2'],
    'telefone3': ['telefone3', 'tel3', 'fone3'],
    'banco': ['banco', 'cod_banco', 'codigo_banco', 'banco_codigo'],
    'margem_disponivel': ['margem', 'margem_disponivel', 'vl_margem', 'margem_livre'],
    'valor_beneficio': ['beneficio', 'valor_beneficio', 'vl_beneficio'],
    'uf': ['uf', 'estado', 'sigla_uf'],
    'municipio': ['municipio', 'cidade', 'nm_municipio'],
    'numero_beneficio': ['nb', 'numero_beneficio', 'nr_beneficio', 'beneficio_numero'],
    'especie': ['especie', 'cd_especie', 'codigo_especie'],
    'dib': ['dib', 'dt_dib', 'data_dib'],
    'data_nascimento': ['nascimento', 'data_nascimento', 'dt_nascimento', 'data_nasc'],
    'numero_contrato': ['contrato', 'numero_contrato', 'nr_contrato', 'cd_contrato'],
    'parcelas_restantes': ['parcelas', 'parcelas_restantes', 'qt_parcelas', 'prazo'],
    'valor_parcela': ['parcela', 'valor_parcela', 'vl_parcela'],
    'saldo_devedor': ['saldo', 'saldo_devedor', 'vl_saldo'],
    'taxa': ['taxa', 'taxa_juros', 'tx_juros'],
  };
  
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim().replace(/[_\s]+/g, '_');
    
    for (const [key, variants] of Object.entries(columnMap)) {
      if (variants.some(v => normalized.includes(v.replace(/\s+/g, '_')))) {
        if (!map.has(key)) {
          map.set(key, index);
        }
        break;
      }
    }
  });
  
  return map;
}

function processRow(row: string[], headerMap: Map<string, number>, _headers: string[]): { client: any; contract: any } {
  const getValue = (key: string): string | null => {
    const index = headerMap.get(key);
    if (index === undefined || index >= row.length) return null;
    const value = row[index]?.trim();
    return value || null;
  };
  
  const cleanCPF = (cpf: string | null): string | null => {
    if (!cpf) return null;
    return cpf.replace(/\D/g, '').padStart(11, '0');
  };
  
  const parseNumber = (value: string | null): number | null => {
    if (!value) return null;
    const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };
  
  const cpf = cleanCPF(getValue('cpf'));
  
  const client = cpf ? {
    cpf,
    nome: getValue('nome'),
    telefone1: getValue('telefone1'),
    telefone2: getValue('telefone2'),
    telefone3: getValue('telefone3'),
    banco: getValue('banco'),
    margem_disponivel: getValue('margem_disponivel'),
    valor_beneficio: getValue('valor_beneficio'),
    uf: getValue('uf'),
    municipio: getValue('municipio'),
    numero_beneficio: getValue('numero_beneficio'),
    especie: getValue('especie'),
    dib: getValue('dib'),
    data_nascimento: getValue('data_nascimento'),
  } : null;
  
  const numeroContrato = getValue('numero_contrato');
  const contract = cpf && numeroContrato ? {
    cpf,
    numero_contrato: numeroContrato,
    banco: getValue('banco'),
    parcelas_restantes: parseNumber(getValue('parcelas_restantes')),
    valor_parcela: parseNumber(getValue('valor_parcela')),
    saldo_devedor: parseNumber(getValue('saldo_devedor')),
    taxa: parseNumber(getValue('taxa')),
  } : null;
  
  return { client, contract };
}

async function saveToDatabase(supabase: any, clients: any[], contracts: any[]): Promise<void> {
  if (clients.length > 0) {
    const { error: clientError } = await supabase
      .from('baseoff')
      .upsert(clients, { 
        onConflict: 'cpf',
        ignoreDuplicates: false 
      });
    
    if (clientError) {
      console.error('Error inserting clients:', clientError);
    }
  }
  
  if (contracts.length > 0) {
    const { error: contractError } = await supabase
      .from('baseoff_contratos')
      .upsert(contracts, { 
        onConflict: 'cpf,numero_contrato',
        ignoreDuplicates: false 
      });
    
    if (contractError) {
      console.error('Error inserting contracts:', contractError);
    }
  }
}
