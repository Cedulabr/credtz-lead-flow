import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Mic, Copy } from 'lucide-react';

interface Example {
  title: string;
  category: string;
  voiceName: string;
  voiceId: string;
  text: string;
}

const EXAMPLES: Example[] = [
  {
    title: 'Portabilidade — Abordagem Inicial',
    category: 'Televendas',
    voiceName: 'Sarah',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
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
    voiceName: 'Laura',
    voiceId: 'FGY2WhTYpPnrIDTdsKH5',
    text: `{{locução amigável}} Oi! Aqui é da central de benefícios. {{pausa curta}}
{{locução profissional}} Estou entrando em contato porque o senhor foi pré-aprovado para o Cartão Consignado com limite especial! {{tom entusiasmado}}
{{tom prestativo}} O cartão não compromete sua margem de empréstimo e o desconto mínimo é bem baixinho no seu benefício. {{pausa curta}}
{{tom de urgência}} Essa condição especial é por tempo limitado... {{ênfase}}
{{tom acolhedor}} Posso explicar certinho como funciona?`,
  },
  {
    title: 'Refinanciamento — Redução de Parcela',
    category: 'Televendas',
    voiceName: 'Roger',
    voiceId: 'CwhRBWXzGAHq8TQ4Fs17',
    text: `{{locução cordial}} Bom dia! Tudo bem com o senhor? {{pausa curta}}
{{locução profissional}} Aqui é do setor de análise de contratos consignados. {{sorrindo}}
{{tom prestativo}} Estou ligando porque identifiquei que o senhor possui contratos que podem ser refinanciados com uma taxa MENOR. {{ênfase}} {{pausa curta}}
{{tom entusiasmado}} Isso significa parcela menor ou dinheiro na conta! {{pausa curta}}
{{tom acolhedor}} Consegue dois minutinhos pra eu mostrar a simulação?`,
  },
  {
    title: 'Cobrança Amigável — Lembrete',
    category: 'Cobrança',
    voiceName: 'Alice',
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
    text: `{{locução amigável}} Olá! Aqui é da central de atendimento. {{pausa curta}}
{{tom suave}} Estou entrando em contato porque identificamos uma pendência no seu cadastro que precisa de uma atenção. {{pausa curta}}
{{tom prestativo}} Mas fique tranquilo, temos condições especiais de negociação que cabem no seu bolso. {{sorrindo}} {{pausa curta}}
{{tom acolhedor}} Posso te ajudar a resolver isso agora de um jeito bem simples?`,
  },
];

interface ExamplesDialogProps {
  onUseExample: (text: string, voiceId: string, voiceName: string) => void;
}

export function ExamplesDialog({ onUseExample }: ExamplesDialogProps) {
  const [open, setOpen] = useState(false);

  const handleUse = (example: Example) => {
    onUseExample(example.text, example.voiceId, example.voiceName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Scripts de vendas com variáveis de fala prontos para usar. Clique em "Usar" para carregar no editor.
          </p>
        </DialogHeader>

        <ScrollArea className="h-[450px] pr-3">
          <div className="space-y-3">
            {EXAMPLES.map((ex, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">{ex.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{ex.category}</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Mic className="h-2.5 w-2.5" /> {ex.voiceName}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleUse(ex)} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" /> Usar
                  </Button>
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
                  {ex.text}
                </pre>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
