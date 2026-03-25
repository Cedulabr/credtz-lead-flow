import { useState, useRef } from 'react';
import { Voice } from '../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Search, Mic } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface VoiceSelectorProps {
  voices: Voice[];
  loading: boolean;
  selectedVoiceId: string | null;
  onSelect: (voice: Voice) => void;
}

export function VoiceSelector({ voices, loading, selectedVoiceId, onSelect }: VoiceSelectorProps) {
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = voices.filter((v) => {
    const s = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(s) ||
      (v.labels?.accent || '').toLowerCase().includes(s) ||
      (v.labels?.gender || '').toLowerCase().includes(s)
    );
  });

  const togglePreview = (voice: Voice) => {
    if (playingId === voice.voice_id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!voice.preview_url) return;

    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(voice.preview_url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(voice.voice_id);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Selecionar Voz</h3>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Selecionar Voz</h3>
        <Badge variant="outline" className="text-xs">{voices.length} vozes</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar voz..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <ScrollArea className="h-[240px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-3">
          {filtered.map((voice) => (
            <Card
              key={voice.voice_id}
              className={cn(
                'p-3 cursor-pointer transition-all hover:shadow-md',
                selectedVoiceId === voice.voice_id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'hover:border-primary/30'
              )}
              onClick={() => onSelect(voice)}
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{voice.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {voice.labels?.gender && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {voice.labels.gender}
                      </Badge>
                    )}
                    {voice.labels?.accent && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {voice.labels.accent}
                      </Badge>
                    )}
                  </div>
                </div>
                {voice.preview_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreview(voice);
                    }}
                  >
                    {playingId === voice.voice_id ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
