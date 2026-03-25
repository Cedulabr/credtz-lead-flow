import { Button } from '@/components/ui/button';
import { EMOTION_VARIABLES } from '../utils/variableConverter';

interface VariableButtonsProps {
  onInsert: (variable: string) => void;
}

export function VariableButtons({ onInsert }: VariableButtonsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">
        Inserir variáveis de emoção (clique para inserir na posição do cursor):
      </p>
      <div className="flex flex-wrap gap-1.5">
        {EMOTION_VARIABLES.map((v) => (
          <Button
            key={v.variable}
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2 hover:bg-primary/10 hover:border-primary/40"
            onClick={() => onInsert(v.variable)}
          >
            {v.emoji} {v.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
