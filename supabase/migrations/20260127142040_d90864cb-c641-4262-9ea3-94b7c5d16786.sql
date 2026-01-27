-- Add file_hash columns to import_logs and import_jobs tables
ALTER TABLE import_logs 
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

ALTER TABLE import_jobs 
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Create index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_import_logs_file_hash ON import_logs(file_hash);
CREATE INDEX IF NOT EXISTS idx_import_jobs_file_hash ON import_jobs(file_hash);

-- Function to check if a file was already imported
CREATE OR REPLACE FUNCTION check_duplicate_import(
  p_file_hash TEXT,
  p_module TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  original_import_date TIMESTAMPTZ,
  original_file_name TEXT,
  records_imported INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check import_logs first
  RETURN QUERY
  SELECT 
    TRUE as is_duplicate,
    il.created_at as original_import_date,
    il.file_name as original_file_name,
    COALESCE(il.records_imported, 0)::INTEGER as records_imported
  FROM import_logs il
  WHERE il.file_hash = p_file_hash
    AND (p_module IS NULL OR il.module = p_module)
  ORDER BY il.created_at DESC
  LIMIT 1;
  
  -- If nothing found in import_logs, check import_jobs
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      TRUE as is_duplicate,
      ij.created_at as original_import_date,
      ij.file_name as original_file_name,
      COALESCE(ij.records_processed, 0)::INTEGER as records_imported
    FROM import_jobs ij
    WHERE ij.file_hash = p_file_hash
      AND (p_module IS NULL OR ij.module = p_module)
    ORDER BY ij.created_at DESC
    LIMIT 1;
  END IF;
  
  -- If still nothing found, return not duplicate
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, NULL::TEXT, 0;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_duplicate_import(TEXT, TEXT) TO authenticated;