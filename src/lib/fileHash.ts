/**
 * Utility for calculating file hashes using Web Crypto API
 * Used to detect duplicate file imports across all modules
 */

/**
 * Calculate SHA-256 hash of a file
 * @param file - The file to hash
 * @returns Promise with hex string of the hash
 */
export async function calculateFileHash(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Error calculating file hash:', error);
    throw error;
  }
}

/**
 * Check if a file hash already exists in import history
 * @param hash - The file hash to check
 * @param module - Optional module filter (leads_database, activate_leads, baseoff)
 * @returns Promise with duplicate information or null if not found
 */
export interface DuplicateImportInfo {
  isDuplicate: boolean;
  originalImportDate: Date | null;
  originalFileName: string | null;
  recordsImported: number;
}

import { supabase } from '@/integrations/supabase/client';

export async function checkDuplicateImport(
  hash: string,
  module?: string
): Promise<DuplicateImportInfo> {
  try {
    const { data, error } = await supabase.rpc('check_duplicate_import', {
      p_file_hash: hash,
      p_module: module || null
    });

    if (error) {
      console.error('Error checking duplicate import:', error);
      return { isDuplicate: false, originalImportDate: null, originalFileName: null, recordsImported: 0 };
    }

    // The RPC returns an array, get first result
    const result = Array.isArray(data) ? data[0] : data;
    
    if (result && result.is_duplicate) {
      return {
        isDuplicate: true,
        originalImportDate: result.original_import_date ? new Date(result.original_import_date) : null,
        originalFileName: result.original_file_name,
        recordsImported: result.records_imported || 0
      };
    }

    return { isDuplicate: false, originalImportDate: null, originalFileName: null, recordsImported: 0 };
  } catch (error) {
    console.error('Error in checkDuplicateImport:', error);
    return { isDuplicate: false, originalImportDate: null, originalFileName: null, recordsImported: 0 };
  }
}
