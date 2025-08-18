import { useState, useCallback } from 'react';
import { supabase, checkConnection, refreshSession } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseSupabaseOptions {
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function useSupabase(options: UseSupabaseOptions = {}) {
  const { enableRetry = true, maxRetries = 3, retryDelay = 1000 } = options;
  const [isLoading, setIsLoading] = useState(false);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error: any) {
      console.error('Supabase operation failed:', error);

      // Check if it's a connection error
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        const isConnected = await checkConnection();
        if (!isConnected) {
          toast.error('Connection to database lost. Please check your internet connection.');
          throw error;
        }
      }

      // Check if it's an authentication error
      if (error.message?.includes('JWT') || error.message?.includes('token')) {
        const refreshResult = await refreshSession();
        if (refreshResult.success) {
          toast.success('Session refreshed. Please try again.');
          return await operation();
        } else {
          toast.error('Session expired. Please sign in again.');
          throw error;
        }
      }

      // Retry logic for other errors
      if (enableRetry && retryCount < maxRetries) {
        toast.warning(`Operation failed. Retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeWithRetry(operation, retryCount + 1);
      }

      throw error;
    }
  }, [enableRetry, maxRetries, retryDelay]);

  const query = useCallback(async <T>(
    operation: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> => {
    setIsLoading(true);
    try {
      const result = await executeWithRetry(operation);
      return result;
    } catch (error: any) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [executeWithRetry]);

  const mutation = useCallback(async <T>(
    operation: () => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> => {
    setIsLoading(true);
    try {
      const result = await executeWithRetry(operation);
      return result;
    } catch (error: any) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [executeWithRetry]);

  return {
    supabase,
    query,
    mutation,
    isLoading,
    checkConnection,
    refreshSession,
  };
}
