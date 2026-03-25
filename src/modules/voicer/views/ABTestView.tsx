import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { FlaskConical, Play, Pause, Trophy, Mic, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVoices } from '../hooks/useVoices';
import { useAudioGeneration } from '../hooks/useAudioGeneration';
import { useVoicerCredits } from '../hooks/useVoicerCredits';
import { VoiceSelector } from '../components/VoiceSelector';
import { AudioSettings, Voice } from '../types';
import { toast } from 'sonner';

interface ABSide {
  text: string;
  voice: Voice | null;
  audioUrl: string | null;
  generationId: string | null;
}

const DEFAULT_SETTINGS: AudioSettings = {
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  speed: 1.0,
};

export function ABTestView() {
  const { user } = useAuth();
  const { voices, loading: voicesLoading } = useVoices();
  const { generate, generating } = useAudioGeneration();
  const { reload: reloadCredits } = useVoicerCredits();

  const [sideA, setSideA] = useState<ABSide>({ text: '', voice: null, audioUrl: null, generationId: null });
  const [sideB, setSideB] = useState<ABSide>({ text: '', voice: null, audioUrl: null, generationId: null });
  const [generatingSide, setGeneratingSide] = useState<'a' | 'b' | null>(null);
  const [playingA, setPlayingA] = useState(false);
  const [playingB, setPlayingB] = useState(false);
  const [audioA, setAudioA] = useState<HTMLAudioElement | null>(null);
  const [audioB, setAudioB] = useState<HTMLAudioElement | null>(null);
  const [winner, setWinner] = useState<'a' | 'b' | null>(null);

  const handleGenerate = async (side: 'a' | 'b') => {
    const s = side === 'a' ? sideA : sideB;
    if (!s.text.trim() || !s.voice) {
      toast.error('Preencha o texto e selecione uma voz');
      return;
    }

    setGeneratingSide(side);
    const result = await generate(s.text, s.voice.voice_id, s.voice.name, DEFAULT_SETTINGS);
    if (result) {
      const setter = side === 'a' ? setSideA : setSideB;
      setter(prev => ({ ...prev, audioUrl: result.audioUrl, generationId: result.generationId }));
      reloadCredits();
    }
    setGeneratingSide(null);
  };

  const togglePlay = (side: 'a' | 'b') => {
    const s = side === 'a' ? sideA : sideB;
    const playing = side === 'a' ? playingA : playingB;
    const setPlaying = side === 'a' ? setPlayingA : setPlayingB;
    const currentAudio = side === 'a' ? audioA : audioB;
    const setAudio = side === 'a' ? setAudioA : setAudioB;

    if (!s.audioUrl) return;

    if (playing && currentAudio) {
      currentAudio.pause();
      setPlaying(false);
      return;
    }

    // Stop the other side
    if (side === 'a' && audioB) { audioB.pause(); setPlayingB(false); }
    if (side === 'b' && audioA) { audioA.pause(); setPlayingA(false); }

    const audio = new Audio(s.audioUrl);
    audio.addEventListener('ended', () => { setPlaying(false); setAudio(null); });
    audio.play();
    setPlaying(true);
    setAudio(audio);
  };

  const handleSelectWinner = async (side: 'a' | 'b') => {
    if (!user || !sideA.generationId || !sideB.generationId) return;
    setWinner(side);

    try {
      await supabase.from('voicer_ab_tests' as any).insert({
        user_id: user.id,
        generation_a_id: sideA.generationId,
        generation_b_id: sideB.generationId,
        winner_id: side === 'a' ? sideA.generationId : sideB.generationId,
      });
      toast.success(`Versão ${side.toUpperCase()} selecionada como vencedora!`);
    } catch {
      toast.error('Erro ao salvar resultado');
    }
  };

  const renderSide = (side: 'a' | 'b') => {
    const s = side === 'a' ? sideA : sideB;
    const setter = side === 'a' ? setSideA : setSideB;
    const playing = side === 'a' ? playingA : playingB;
    const isGenerating = generatingSide === side;
    const isWinner = winner === side;

    return (
      <Card className={`${isWinner ? 'border-primary ring-2 ring-primary/20' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant={side === 'a' ? 'default' : 'secondary'} className="text-xs">
              {side.toUpperCase()}
            </Badge>
            Versão {side.toUpperCase()}
            {isWinner && <Trophy className="h-4 w-4 text-yellow-500 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Texto da versão ${side.toUpperCase()}...`}
            value={s.text}
            onChange={e => setter(prev => ({ ...prev, text: e.target.value }))}
            rows={4}
            className="resize-none"
          />

          <VoiceSelector
            voices={voices}
            loading={voicesLoading}
            selectedVoiceId={s.voice?.voice_id || null}
            onSelect={(v) => setter(prev => ({ ...prev, voice: v }))}
          />

          <Button
            className="w-full"
            onClick={() => handleGenerate(side)}
            disabled={isGenerating || generating || !s.text.trim() || !s.voice}
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</>
            ) : (
              <><Mic className="h-4 w-4 mr-2" /> Gerar Áudio {side.toUpperCase()}</>
            )}
          </Button>

          {s.audioUrl && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => togglePlay(side)}
              >
                {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                {playing ? 'Pausar' : 'Ouvir'} {side.toUpperCase()}
              </Button>
              {sideA.audioUrl && sideB.audioUrl && !winner && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSelectWinner(side)}
                >
                  <Trophy className="h-4 w-4 mr-1" /> Vencedor
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Teste A/B</h2>
          <p className="text-sm text-muted-foreground">Compare duas versões de áudio e escolha a melhor</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderSide('a')}
        {renderSide('b')}
      </div>
    </div>
  );
}
