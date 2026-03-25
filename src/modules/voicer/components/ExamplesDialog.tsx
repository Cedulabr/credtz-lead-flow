import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Mic, Copy, Play, Pause, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Example {
  title: string;
  category: string;
  characterName: string;
  characterEmoji: string;
  characterRole: string;
  voiceName: string;
  voiceId: string;
  text: string;
  exampleKey: string;
}

const EXAMPLES: Example[] = [
  {
    title: 'Portabilidade — Abordagem Inicial',
    category: 'Televendas',
    characterName: 'Ana Beatriz',
    characterEmoji: '👩‍💼',
    characterRole: 'Consultora simpática',
    voiceName: 'Sarah',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    exampleKey: 'portabilidade-sarah',
    text: `{{locução amigável}} Olá! Tudo bem? {{pausa curta}}
{{locução profissional}} Aqui é da central de crédito consignado, somos especializados no produto Portabilidade. {{sorrindo}}
{{tom prestativo}} Eu estou te chamando rapidinho porque surgiram umas oportunidades na renovação dos seus contratos... {{pausa curta}}
{{tom entusiasmado}} Que podem te ajudar MUITO agora. {{ênfase}}
{{tom conspiratório}} Inclusive, é algo que nem todo mundo está conseguindo acessar... {{pausa curta}}
{{tom acolhedor}} Você consegue falar comigo agora rapidinho?`,
  },
  {
    title: 'Cartão Consignado — Oferta',
    category: 'Televendas',
    characterName: 'Camila Torres',
    characterEmoji: '👩‍🎤',
    characterRole: 'Especialista animada',
    voiceName: 'Laura',
    voiceId: 'FGY2WhTYpPnrIDTdsKH5',
    exampleKey: 'cartao-laura',
    text: `{{locução amigável}} Oi! Aqui é da central de benefícios. {{pausa curta}}
{{locução profissional}} Estou entrando em contato porque o senhor foi pré-aprovado para o Cartão Consignado com limite especial! {{tom entusiasmado}}
{{tom prestativo}} O cartão não compromete sua margem de empréstimo e o desconto mínimo é bem baixinho no seu benefício. {{pausa curta}}
{{tom de urgência}} Essa condição especial é por tempo limitado... {{ênfase}}
{{tom acolhedor}} Posso explicar certinho como funciona?`,
  },
  {
    title: 'Refinanciamento — Redução de Parcela',
    category: 'Televendas',
    characterName: 'Carlos Eduardo',
    characterEmoji: '👨‍💼',
    characterRole: 'Analista cordial',
    voiceName: 'Roger',
    voiceId: 'CwhRBWXzGAHq8TQ4Fs17',
    exampleKey: 'refinanciamento-roger',
    text: `{{locução cordial}} Bom dia! Tudo bem com o senhor? {{pausa curta}}
{{locução profissional}} Aqui é do setor de análise de contratos consignados. {{sorrindo}}
{{tom prestativo}} Estou ligando porque identifiquei que o senhor possui contratos que podem ser refinanciados com uma taxa MENOR. {{ênfase}} {{pausa curta}}
{{tom entusiasmado}} Isso significa parcela menor ou dinheiro na conta! {{pausa curta}}
{{tom acolhedor}} Consegue dois minutinhos pra eu mostrar a simulação?`,
  },
  {
    title: 'Novo Empréstimo — Taxa Especial',
    category: 'Televendas',
    characterName: 'Rafael Lima',
    characterEmoji: '👨‍🔬',
    characterRole: 'Consultor entusiasmado',
    voiceName: 'Daniel',
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    exampleKey: 'emprestimo-daniel',
    text: `{{locução amigável}} Olá! Tudo bem? {{pausa curta}}
{{locução profissional}} Aqui é da central de crédito consignado. {{sorrindo}}
{{tom entusiasmado}} Tenho uma ótima notícia! O senhor tem margem disponível para um novo empréstimo com taxa ESPECIAL. {{ênfase}} {{pausa curta}}
{{tom prestativo}} São condições que só estão sendo oferecidas para quem tem um bom histórico, como o senhor. {{pausa curta}}
{{tom conspiratório}} E o melhor... a taxa está abaixo do que os bancos costumam praticar. {{pausa curta}}
{{tom acolhedor}} Posso te passar os valores rapidinho?`,
  },
];

interface ExamplesDialogProps {
  onUseExample: (text: string, voiceId: string, voiceName: string) => void;
}

export function ExamplesDialog({ onUseExample }: ExamplesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleUse = (example: Example) => {
    onUseExample(example.text, example.voiceId, example.voiceName);
    setOpen(false);
  };

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingKey(null);
  }, []);

  const handlePlay = useCallback(async (example: Example) => {
    // If same audio is playing, pause it
    if (playingKey === example.exampleKey) {
      stopCurrentAudio();
      return;
    }

    // Stop any currently playing audio
    stopCurrentAudio();

    // If we already have the URL cached, play immediately
    if (audioUrls[example.exampleKey]) {
      const audio = new Audio(audioUrls[example.exampleKey]);
      audioRef.current = audio;
      setPlayingKey(example.exampleKey);
      audio.onended = () => setPlayingKey(null);
      audio.onerror = () => {
        setPlayingKey(null);
        toast.error('Erro ao reproduzir áudio');
      };
      await audio.play();
      return;
    }

    // Generate via edge function
    setLoadingKey(example.exampleKey);
    try {
      const { data, error } = await supabase.functions.invoke('voicer-generate-example', {
        body: {
          text: example.text,
          voiceId: example.voiceId,
          exampleKey: example.exampleKey,
        },
      });

      if (error) throw error;
      if (!data?.audioUrl) throw new Error('No audio URL returned');

      // Cache the URL
      setAudioUrls(prev => ({ ...prev, [example.exampleKey]: data.audioUrl }));

      // Play
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      setPlayingKey(example.exampleKey);
      audio.onended = () => setPlayingKey(null);
      audio.onerror = () => {
        setPlayingKey(null);
        toast.error('Erro ao reproduzir áudio');
      };
      await audio.play();
    } catch (err) {
      console.error('Error generating example audio:', err);
      toast.error('Erro ao gerar áudio do exemplo');
    } finally {
      setLoadingKey(null);
    }
  }, [playingKey, audioUrls, stopCurrentAudio]);

  // Clean up audio when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) stopCurrentAudio();
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Exemplos prontos 🆕
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Exemplos Prontos
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Scripts de vendas com variáveis de fala prontos para usar. Clique em ▶ para ouvir o áudio modelo ou em "Usar" para carregar no editor.
          </p>
        </DialogHeader>

        <ScrollArea className="h-[450px] pr-3">
          <div className="space-y-3">
            {EXAMPLES.map((ex) => {
              const isLoading = loadingKey === ex.exampleKey;
              const isPlaying = playingKey === ex.exampleKey;

              return (
                <Card key={ex.exampleKey} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Play button */}
                    <button
                      onClick={() => handlePlay(ex)}
                      disabled={isLoading}
                      className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                    </button>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {ex.characterEmoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold">{ex.title}</h4>
                      <p className="text-xs text-muted-foreground">{ex.characterName} — {ex.characterRole}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{ex.category}</Badge>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Mic className="h-2.5 w-2.5" /> {ex.voiceName}
                        </Badge>
                      </div>
                    </div>

                    {/* Use button */}
                    <Button size="sm" onClick={() => handleUse(ex)} className="gap-1.5 shrink-0">
                      <Copy className="h-3.5 w-3.5" /> Usar
                    </Button>
                  </div>

                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
                    {ex.text}
                  </pre>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
