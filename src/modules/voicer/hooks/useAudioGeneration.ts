import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AudioSettings } from '../types';
import { convertVariables, countCharactersExcludingVariables, calculateCreditsCost } from '../utils/variableConverter';
import { toast } from 'sonner';

export function useAudioGeneration() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const generate = async (
    text: string,
    voiceId: string,
    voiceName: string,
    settings: AudioSettings
  ) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    const convertedText = convertVariables(text);
    const charCount = countCharactersExcludingVariables(text);
    const creditsCost = calculateCreditsCost(charCount);

    // Check credits
    const { data: creditsData } = await supabase.rpc('get_user_credits', {
      target_user_id: user.id,
    });
    const currentCredits = creditsData ?? 0;

    if (currentCredits < creditsCost) {
      toast.error(`Créditos insuficientes. Necessário: ${creditsCost}, disponível: ${currentCredits}`);
      return null;
    }

    setGenerating(true);
    setAudioUrl(null);

    try {
      // Create generation record
      const { data: genRecord, error: genError } = await supabase
        .from('audio_generations' as any)
        .insert({
          user_id: user.id,
          text_original: text,
          text_converted: convertedText,
          voice_id: voiceId,
          voice_name: voiceName,
          characters_count: charCount,
          credits_used: creditsCost,
          settings_json: settings,
          status: 'processing',
        })
        .select('id')
        .single();

      if (genError) throw genError;
      const recordId = (genRecord as any).id;
      setGenerationId(recordId);

      // Call TTS edge function
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            text: convertedText,
            voiceId,
            settings,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const result = await response.json();

      // Play audio from base64
      const playableUrl = `data:audio/mpeg;base64,${result.audioBase64}`;
      setAudioUrl(playableUrl);

      // Update generation record
      await supabase
        .from('audio_generations' as any)
        .update({
          audio_url: result.audioUrl,
          file_path: result.filePath,
          status: 'ready',
        })
        .eq('id', recordId);

      // Debit credits
      await supabase.rpc('admin_manage_credits', {
        target_user_id: user.id,
        credit_action: 'remove',
        credit_amount: creditsCost,
        credit_reason: `Voicer: geração de áudio (${charCount} caracteres)`,
      });

      // Log voicer transaction
      await supabase.from('voicer_credit_transactions' as any).insert({
        user_id: user.id,
        type: 'debit',
        amount: creditsCost,
        description: `Geração TTS - ${voiceName} (${charCount} chars)`,
        generation_id: recordId,
      });

      toast.success('Áudio gerado com sucesso!');
      return { audioUrl: playableUrl, generationId: recordId };
    } catch (err) {
      console.error('Generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar áudio');

      // Update status to error
      if (generationId) {
        await supabase
          .from('audio_generations' as any)
          .update({ status: 'error' })
          .eq('id', generationId);
      }
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generate,
    generating,
    audioUrl,
    generationId,
    setAudioUrl,
  };
}
