import * as XLSX from 'xlsx';
import type { FieldDef } from './columnsConfig';

export function downloadTemplate(filename: string, fields: FieldDef[]) {
  const headers = fields.map(f => f.label);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  // Larguras
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  XLSX.writeFile(wb, filename);
}

export function downloadSkippedReport(filename: string, rows: Array<{ cpf?: string; reason: string; row?: any }>) {
  const data = rows.map(r => ({ CPF: r.cpf ?? '', Motivo: r.reason, ...((r.row as object) ?? {}) }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ignorados');
  XLSX.writeFile(wb, filename);
}

export async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '', raw: false });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  return { headers, rows: json };
}
