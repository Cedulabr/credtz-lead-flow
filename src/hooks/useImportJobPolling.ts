import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImportJob {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  size_mb: number;
  status: string;
  total_rows: number | null;
  processed_rows: number | null;
  error_log: any;
  created_at: string;
  updated_at: string;
  last_processed_offset: number | null;
  chunk_metadata: any;
  processing_started_at: string | null;
  processing_ended_at: string | null;
}

interface UseImportJobPollingOptions {
  jobId: string | null;
  enabled?: boolean;
  pollingInterval?: number;
  onComplete?: (job: ImportJob) => void;
  onError?: (job: ImportJob) => void;
  onChunkComplete?: (job: ImportJob) => void;
}

export function useImportJobPolling({
  jobId,
  enabled = true,
  pollingInterval = 2000,
  onComplete,
  onError,
  onChunkComplete,
}: UseImportJobPollingOptions) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isContinuingRef = useRef(false);

  const fetchJob = useCallback(async () => {
    if (!jobId) return null;
    
    const { data, error: fetchError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (fetchError) {
      setError(fetchError.message);
      return null;
    }
    
    return data as unknown as ImportJob;
  }, [jobId]);

  const continueProcessing = useCallback(async (nextOffset: number) => {
    if (!jobId || isContinuingRef.current) return;
    
    isContinuingRef.current = true;
    
    try {
      const response = await supabase.functions.invoke('process-import', {
        body: { job_id: jobId, continue_from_offset: nextOffset }
      });
      
      if (response.error) {
        console.error('Error continuing import:', response.error);
      }
    } catch (err) {
      console.error('Error invoking continue:', err);
    } finally {
      isContinuingRef.current = false;
    }
  }, [jobId]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsPolling(true);
    
    intervalRef.current = setInterval(async () => {
      const latestJob = await fetchJob();
      
      if (latestJob) {
        setJob(latestJob);
        
        if (latestJob.status === 'completed') {
          stopPolling();
          onComplete?.(latestJob);
        } else if (latestJob.status === 'failed') {
          stopPolling();
          onError?.(latestJob);
        } else if (latestJob.status === 'chunk_completed') {
          onChunkComplete?.(latestJob);
          // Auto-continue processing
          const nextOffset = latestJob.chunk_metadata?.next_offset;
          if (nextOffset !== undefined && nextOffset !== null) {
            continueProcessing(nextOffset);
          }
        }
      }
    }, pollingInterval);
  }, [fetchJob, pollingInterval, onComplete, onError, onChunkComplete, continueProcessing]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Start polling when enabled and jobId changes
  useEffect(() => {
    if (enabled && jobId) {
      // Fetch immediately
      fetchJob().then(data => {
        if (data) {
          setJob(data);
          if (data.status === 'processing' || data.status === 'uploaded' || data.status === 'chunk_completed') {
            startPolling();
          }
        }
      });
    }
    
    return () => {
      stopPolling();
    };
  }, [enabled, jobId, fetchJob, startPolling, stopPolling]);

  const progress = job 
    ? ((job.processed_rows || 0) / Math.max(job.total_rows || 1, 1)) * 100 
    : 0;

  return {
    job,
    isPolling,
    error,
    progress,
    startPolling,
    stopPolling,
    continueProcessing,
    refetch: fetchJob,
  };
}
