import { useState, useRef } from 'react';
import { Voice } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, Pause, Search, Mic, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface VoiceSelectorProps {
  voices: Voice[];
  loading: boolean;
  selectedVoiceId: string | null;
  onSelect: (voice: Voice) => void;
}

export function VoiceSelector({ voices, loading, selectedVoiceId, onSelect }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId);

  const filtered = voices.filter((v) => {
    const s = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(s) ||
      (v.labels?.accent || '').toLowerCase().includes(s) ||
      (v.labels?.gender || '').toLowerCase().includes(s)
    );
  });

  const togglePreview = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px] h-10"
          disabled={loading}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mic className="h-3 w-3 text-primary" />
            </div>
            <span className="truncate">
              {loading ? 'Carregando...' : selectedVoice ? selectedVoice.name : 'Selecionar voz'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar voz..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[280px]">
          <div className="p-1">
            {filtered.map((voice) => (
              <div
                key={voice.voice_id}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors',
                  selectedVoiceId === voice.voice_id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => {
                  onSelect(voice);
                  setOpen(false);
                }}
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mic className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{voice.name}</p>
                  <div className="flex gap-1">
                    {voice.labels?.gender && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">{voice.labels.gender}</Badge>
                    )}
                    {voice.labels?.accent && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">{voice.labels.accent}</Badge>
                    )}
                  </div>
                </div>
                {voice.preview_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={(e) => togglePreview(voice, e)}
                  >
                    {playingId === voice.voice_id ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhuma voz encontrada</p>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-2">
          <p className="text-[10px] text-muted-foreground text-center">{voices.length} vozes disponíveis</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
