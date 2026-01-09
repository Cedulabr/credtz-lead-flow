import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

interface ChunkedReaderOptions {
  chunkSize?: number;
  onProgress?: (percent: number) => void;
  onChunk?: (rows: any[][], chunkIndex: number, isLast: boolean) => Promise<void>;
}

interface ChunkedReaderResult {
  headers: string[];
  totalRows: number;
  processedRows: number;
}

export function useChunkedFileReader() {
  const [isReading, setIsReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const parseCSVChunked = useCallback(async (
    text: string,
    options: ChunkedReaderOptions
  ): Promise<ChunkedReaderResult> => {
    const { chunkSize = 1000, onProgress, onChunk } = options;
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    
    if (lines.length < 2) {
      throw new Error("Arquivo vazio ou sem dados");
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    const totalRows = lines.length - 1;
    let processedRows = 0;
    let chunkIndex = 0;

    // Process in chunks
    for (let i = 1; i < lines.length; i += chunkSize) {
      if (abortRef.current) break;

      const chunkLines = lines.slice(i, Math.min(i + chunkSize, lines.length));
      const chunkRows: string[][] = [];

      for (const line of chunkLines) {
        chunkRows.push(parseCSVLine(line));
      }

      const isLast = i + chunkSize >= lines.length;
      
      if (onChunk) {
        await onChunk(chunkRows, chunkIndex, isLast);
      }

      processedRows += chunkRows.length;
      chunkIndex++;

      const percent = Math.round((processedRows / totalRows) * 100);
      setProgress(percent);
      if (onProgress) {
        onProgress(percent);
      }

      // Yield to main thread to prevent UI freeze
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return { headers, totalRows, processedRows };
  }, []);

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

  const readXLSXChunked = useCallback(async (
    file: File,
    options: ChunkedReaderOptions
  ): Promise<ChunkedReaderResult> => {
    const { chunkSize = 1000, onProgress, onChunk } = options;

    // Read file in chunks using FileReader
    const buffer = await readFileAsArrayBuffer(file, (loaded, total) => {
      const readPercent = Math.round((loaded / total) * 30); // 30% for reading
      setProgress(readPercent);
      if (onProgress) onProgress(readPercent);
    });

    if (abortRef.current) {
      return { headers: [], totalRows: 0, processedRows: 0 };
    }

    setProgress(35);
    if (onProgress) onProgress(35);

    // Parse XLSX with streaming approach
    const workbook = XLSX.read(buffer, { 
      type: "array", 
      cellDates: true, 
      raw: false,
      sheetRows: 0, // Read all rows
    });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Get range to determine row count
    const range = XLSX.utils.decode_range(firstSheet["!ref"] || "A1");
    const totalRows = range.e.r; // End row (0-indexed)
    
    if (totalRows < 1) {
      throw new Error("Arquivo vazio ou sem dados");
    }

    // Extract headers first
    const headerRow = XLSX.utils.sheet_to_json(firstSheet, { 
      header: 1, 
      raw: false, 
      defval: "",
      range: { s: { r: 0, c: 0 }, e: { r: 0, c: range.e.c } }
    }) as any[][];
    
    const headers = headerRow[0]?.map(h => String(h || "").trim()) || [];

    let processedRows = 0;
    let chunkIndex = 0;

    // Process data in chunks
    for (let startRow = 1; startRow <= totalRows; startRow += chunkSize) {
      if (abortRef.current) break;

      const endRow = Math.min(startRow + chunkSize - 1, totalRows);
      
      // Extract chunk from sheet
      const chunkData = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        raw: false,
        defval: "",
        range: { s: { r: startRow, c: 0 }, e: { r: endRow, c: range.e.c } }
      }) as any[][];

      const isLast = endRow >= totalRows;

      if (onChunk && chunkData.length > 0) {
        await onChunk(chunkData, chunkIndex, isLast);
      }

      processedRows += chunkData.length;
      chunkIndex++;

      // Progress: 35-100% for processing
      const percent = 35 + Math.round((processedRows / totalRows) * 65);
      setProgress(percent);
      if (onProgress) {
        onProgress(percent);
      }

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return { headers, totalRows, processedRows };
  }, []);

  const readFileAsArrayBuffer = (
    file: File, 
    onProgress?: (loaded: number, total: number) => void
  ): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded, event.total);
        }
      };
      
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      
      reader.onerror = () => {
        reject(new Error("Erro ao ler arquivo"));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const readFileChunked = useCallback(async (
    file: File,
    options: ChunkedReaderOptions = {}
  ): Promise<ChunkedReaderResult> => {
    setIsReading(true);
    setProgress(0);
    setError(null);
    abortRef.current = false;

    try {
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      
      if (extension === ".csv") {
        // For CSV, read text first then process
        const text = await file.text();
        return await parseCSVChunked(text, options);
      } else {
        // For XLSX/XLS
        return await readXLSXChunked(file, options);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsReading(false);
    }
  }, [parseCSVChunked, readXLSXChunked]);

  return {
    readFileChunked,
    isReading,
    progress,
    error,
    abort,
  };
}
