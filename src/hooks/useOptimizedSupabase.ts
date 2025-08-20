import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseOptimizedSupabaseOptions {
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, CacheEntry>();

export function useOptimizedSupabase(options: UseOptimizedSupabaseOptions = {}) {
  const { 
    enableRetry = true, 
    maxRetries = 2, 
    retryDelay = 1000,
    enableCache = true,
    cacheTimeout = 300000 // 5 minutes
  } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCacheKey = useCallback((query: string, params?: any) => {
    return `${query}_${JSON.stringify(params)}`;
  }, []);

  const getFromCache = useCallback((key: string) => {
    if (!enableCache) return null;
    
    const entry = cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > cacheTimeout;
    if (isExpired) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  }, [enableCache, cacheTimeout]);

  const setCache = useCallback((key: string, data: any) => {
    if (!enableCache) return;
    
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Clean up old entries if cache gets too large
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
  }, [enableCache]);

  const executeWithRetry = useCallback(async <T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    retryCount = 0
  ): Promise<T> => {
    try {
      // Cancel previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      return await operation(abortControllerRef.current.signal);
    } catch (error: any) {
      console.error('Supabase operation failed:', error);

      // Don't retry if request was aborted
      if (error.name === 'AbortError') {
        throw error;
      }

      // Handle network errors with exponential backoff
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        if (enableRetry && retryCount < maxRetries) {
          const delay = retryDelay * Math.pow(2, retryCount);
          toast.warning(`Connection issue, retrying in ${delay/1000}s...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeWithRetry(operation, retryCount + 1);
        } else {
          toast.error('Network connection failed. Please check your internet.');
        }
      }

      // Handle authentication errors
      if (error.message?.includes('JWT') || error.message?.includes('token')) {
        toast.error('Session expired. Please sign in again.');
      }

      throw error;
    }
  }, [enableRetry, maxRetries, retryDelay]);

  const optimizedQuery = useCallback(async <T>(
    queryFn: (signal?: AbortSignal) => Promise<{ data: T | null; error: any }>,
    cacheKey?: string
  ): Promise<{ data: T | null; error: any }> => {
    setIsLoading(true);
    
    try {
      // Check cache first
      if (cacheKey) {
        const cached = getFromCache(cacheKey);
        if (cached) {
          setIsLoading(false);
          return { data: cached, error: null };
        }
      }

      const result = await executeWithRetry(queryFn);
      
      // Cache successful results
      if (cacheKey && result.data && !result.error) {
        setCache(cacheKey, result.data);
      }
      
      return result;
    } catch (error: any) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [executeWithRetry, getFromCache, setCache]);

  const optimizedMutation = useCallback(async <T>(
    mutationFn: (signal?: AbortSignal) => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> => {
    setIsLoading(true);
    
    try {
      const result = await executeWithRetry(mutationFn);
      
      // Clear relevant cache entries on mutations
      if (result.data && !result.error) {
        // Clear cache entries that might be affected
        const keysToDelete = Array.from(cache.keys()).filter(key => 
          key.includes('profiles') || key.includes('leads') || key.includes('commissions')
        );
        keysToDelete.forEach(key => cache.delete(key));
      }
      
      return result;
    } catch (error: any) {
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [executeWithRetry]);

  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  const cancelRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    supabase,
    query: optimizedQuery,
    mutation: optimizedMutation,
    isLoading,
    clearCache,
    cancelRequests,
    cacheSize: cache.size
  };
}