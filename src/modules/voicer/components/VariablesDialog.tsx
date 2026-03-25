import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Sparkles } from 'lucide-react';
import { VARIABLE_CATEGORIES } from '../utils/variableConverter';

interface VariablesDialogProps {
  onInsert: (variable: string) => void;
}

export function VariablesDialog({ onInsert }: VariablesDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customVar, setCustomVar] = useState('');

  const handleInsert = (variable: string) => {
    onInsert(variable);
    setOpen(false);
  };

  const handleCustomInsert = () => {
    if (customVar.trim()) {
      handleInsert(`{{${customVar.trim()}}}`);
      setCustomVar('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {'{*}'} Variáveis de fala
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Variáveis de Fala
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Clique em uma variável para inserir na posição do cursor. Você também pode criar variáveis personalizadas digitando entre {'{{'} e {'}}'}.
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar variável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] pr-3">
          <div className="space-y-5">
            {VARIABLE_CATEGORIES.map((cat) => {
              const filtered = cat.variables.filter(
                (v) =>
                  !search ||
                  v.label.toLowerCase().includes(search.toLowerCase()) ||
                  v.variable.toLowerCase().includes(search.toLowerCase())
              );
              if (filtered.length === 0) return null;
              return (
                <div key={cat.name}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{cat.icon}</span>
                    <h4 className="text-sm font-semibold text-foreground">{cat.name}</h4>
                    <Badge variant="secondary" className="text-[10px] h-4">{filtered.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filtered.map((v) => (
                      <Button
                        key={v.variable}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 px-2.5 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                        onClick={() => handleInsert(v.variable)}
                      >
                        {v.emoji} {v.label}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Custom variable */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">✏️ Crie sua própria variável</h4>
              <p className="text-xs text-muted-foreground mb-2">
                Digite qualquer instrução e a IA tentará interpretar na geração do áudio.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: tom de vendedor experiente"
                  value={customVar}
                  onChange={(e) => setCustomVar(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomInsert()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleCustomInsert} disabled={!customVar.trim()}>
                  Inserir
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
