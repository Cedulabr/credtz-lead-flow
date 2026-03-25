import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { History, Play, Pause, Download, Trash2, Search, Clock, FileAudio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AudioGeneration } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function HistoryView() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<AudioGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('audio_generations' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setGenerations((data as any[] || []) as AudioGeneration[]);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (gen: AudioGeneration) => {
    if (!gen.audio_url) return;

    if (playingId === gen.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
      return;
    }

    audioElement?.pause();
    const audio = new Audio(gen.audio_url);
    audio.addEventListener('ended', () => { setPlayingId(null); setAudioElement(null); });
    audio.play();
    setPlayingId(gen.id);
    setAudioElement(audio);
  };

  const handleDownload = (gen: AudioGeneration) => {
    if (!gen.audio_url) return;
    const link = document.createElement('a');
    link.href = gen.audio_url;
    link.download = `voicer-${gen.voice_name || 'audio'}-${Date.now()}.mp3`;
    link.click();
  };

  const handleDelete = async (gen: AudioGeneration) => {
    try {
      await supabase.from('audio_generations' as any).delete().eq('id', gen.id);
      setGenerations(prev => prev.filter(g => g.id !== gen.id));
      toast.success('Áudio removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const filtered = generations.filter(g =>
    !search || g.text_original.toLowerCase().includes(search.toLowerCase()) ||
    (g.voice_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel: Record<string, string> = {
    ready: 'Pronto',
    processing: 'Processando',
    error: 'Erro',
    pending: 'Pendente',
  };

  const statusVariant = (s: string) => {
    if (s === 'ready') return 'default' as const;
    if (s === 'error') return 'destructive' as const;
    return 'secondary' as const;
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Meus Áudios</h2>
            <p className="text-sm text-muted-foreground">{generations.length} áudio{generations.length !== 1 ? 's' : ''} gerado{generations.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por texto ou voz..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Carregando histórico...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileAudio className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum áudio encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(gen => (
            <Card key={gen.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Play button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full shrink-0 mt-0.5"
                    onClick={() => togglePlay(gen)}
                    disabled={!gen.audio_url || gen.status !== 'ready'}
                  >
                    {playingId === gen.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </Button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{gen.text_original}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{gen.voice_name || gen.voice_id}</Badge>
                      <Badge variant={statusVariant(gen.status)} className="text-[10px]">{statusLabel[gen.status] || gen.status}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(gen.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{gen.characters_count} chars • {gen.credits_used} créd</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDownload(gen)} disabled={!gen.audio_url}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(gen)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
