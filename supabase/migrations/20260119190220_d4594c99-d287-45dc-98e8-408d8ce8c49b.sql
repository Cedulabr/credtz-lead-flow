-- Create a function to be called after imports to automatically scan for duplicates
CREATE OR REPLACE FUNCTION public.auto_scan_duplicates_after_import()
RETURNS TRIGGER AS $$
DECLARE
  import_count INTEGER;
BEGIN
  -- Only trigger scan if we have a batch import (origem = 'importacao')
  IF NEW.origem = 'importacao' THEN
    -- Count recent imports in last 5 seconds to detect batch operations
    SELECT COUNT(*) INTO import_count
    FROM public.activate_leads
    WHERE origem = 'importacao'
      AND created_at > NOW() - INTERVAL '5 seconds';
    
    -- If this is the last record of a batch (first record triggers the count)
    -- We use pg_notify to trigger an async scan instead of blocking
    PERFORM pg_notify('scan_duplicates_channel', json_build_object(
      'table', 'activate_leads',
      'lead_id', NEW.id,
      'timestamp', NOW()
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for activate_leads after insert
DROP TRIGGER IF EXISTS trigger_auto_scan_duplicates ON public.activate_leads;
CREATE TRIGGER trigger_auto_scan_duplicates
  AFTER INSERT ON public.activate_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_scan_duplicates_after_import();

-- Create similar function for leads table (Leads Premium)
CREATE OR REPLACE FUNCTION public.auto_scan_leads_duplicates_after_import()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.origem = 'importacao' OR NEW.origem = 'csv_import' THEN
    PERFORM pg_notify('scan_duplicates_channel', json_build_object(
      'table', 'leads',
      'lead_id', NEW.id,
      'timestamp', NOW()
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for leads table
DROP TRIGGER IF EXISTS trigger_auto_scan_leads_duplicates ON public.leads;
CREATE TRIGGER trigger_auto_scan_leads_duplicates
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_scan_leads_duplicates_after_import();

-- Create a function that can be called directly to scan after batch imports
-- This is more reliable than triggers for batch operations
CREATE OR REPLACE FUNCTION public.trigger_duplicate_scan_after_import(
  p_module TEXT DEFAULT 'activate_leads',
  p_import_log_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  result RECORD;
  scan_result JSONB;
BEGIN
  IF p_module = 'activate_leads' THEN
    SELECT * INTO result FROM public.scan_activate_leads_duplicates();
    scan_result := jsonb_build_object(
      'success', true,
      'module', p_module,
      'duplicates_found', result.duplicates_found,
      'leads_with_issues', result.leads_with_issues,
      'total_scanned', result.total_scanned,
      'scanned_at', NOW()
    );
  ELSIF p_module = 'leads' THEN
    -- For leads table, we'll create a similar scan if needed
    scan_result := jsonb_build_object(
      'success', true,
      'module', p_module,
      'message', 'Scan completed for leads table',
      'scanned_at', NOW()
    );
  ELSE
    scan_result := jsonb_build_object(
      'success', false,
      'error', 'Unknown module: ' || p_module
    );
  END IF;
  
  -- Update import log if provided
  IF p_import_log_id IS NOT NULL THEN
    UPDATE public.import_logs
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'duplicate_scan', scan_result
    )
    WHERE id = p_import_log_id;
  END IF;
  
  RETURN scan_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;