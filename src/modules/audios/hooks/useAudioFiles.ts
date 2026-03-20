import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AudioFile } from '../types';

export function useAudioFiles() {
  const { user, profile } = useAuth();
  const [audios, setAudios] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudios = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('audio_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audios:', error);
    } else {
      setAudios((data as unknown as AudioFile[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAudios(); }, [fetchAudios]);

  const uploadAudio = async (title: string, file: File): Promise<boolean> => {
    if (!user) return false;
    try {
      const ext = file.name.split('.').pop() || 'mp3';
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // Fetch real company_id from user_companies
      const { data: ucData } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const companyId = ucData?.company_id || null;

      const { error: insertError } = await supabase
        .from('audio_files')
        .insert({
          user_id: user.id,
          company_id: companyId,
          title,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || 'audio/mpeg',
        } as any);

      if (insertError) throw insertError;

      toast.success('Áudio salvo com sucesso!');
      await fetchAudios();
      return true;
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao salvar áudio: ' + err.message);
      return false;
    }
  };

  const deleteAudio = async (audio: AudioFile) => {
    try {
      await supabase.storage.from('audio-files').remove([audio.file_path]);
      const { error } = await supabase.from('audio_files').delete().eq('id', audio.id as any);
      if (error) throw error;
      toast.success('Áudio removido');
      setAudios(prev => prev.filter(a => a.id !== audio.id));
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    }
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('audio-files').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const downloadAsBase64 = async (filePath: string): Promise<{ base64: string; mimeType: string } | null> => {
    try {
      // Try direct download first
      const { data, error } = await supabase.storage.from('audio-files').download(filePath);
      if (error || !data) {
        console.warn('Direct download failed, trying signed URL fallback:', error?.message);
        // Fallback: use signed URL
        const { data: signedData, error: signedError } = await supabase.storage
          .from('audio-files')
          .createSignedUrl(filePath, 3600);
        if (signedError || !signedData?.signedUrl) {
          console.error('Signed URL fallback also failed:', signedError?.message);
          return null;
        }
        const resp = await fetch(signedData.signedUrl);
        if (!resp.ok) return null;
        const blob = await resp.blob();
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return { base64: btoa(binary), mimeType: blob.type || 'audio/mpeg' };
      }
      const buffer = await data.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return { base64: btoa(binary), mimeType: data.type || 'audio/mpeg' };
    } catch (err) {
      console.error('downloadAsBase64 error:', err);
      return null;
    }
  };

  return { audios, loading, uploadAudio, deleteAudio, getPublicUrl, downloadAsBase64, refetch: fetchAudios };
}
