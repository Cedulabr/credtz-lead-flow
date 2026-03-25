import { useState, useEffect } from 'react';
import { Voice } from '../types';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'voicer_voices_cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export function useVoices() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      // Check local cache
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { voices: cachedVoices, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setVoices(cachedVoices);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-voices`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Falha ao carregar vozes');

      const data = await response.json();
      const voiceList = data.voices || [];
      setVoices(voiceList);

      // Save to cache
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ voices: voiceList, timestamp: Date.now() })
      );
    } catch (err) {
      console.error('Error loading voices:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar vozes');
    } finally {
      setLoading(false);
    }
  };

  return { voices, loading, error, reload: loadVoices };
}
