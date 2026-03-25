import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { AudioSettings } from '../types';

interface AudioControlsProps {
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
}

const CONTROLS = [
  {
    key: 'stability' as const,
    label: 'Estabilidade',
    tooltip: 'Controla a consistência da voz. Valores altos = mais consistente, baixos = mais expressivo.',
    min: 0, max: 100, step: 1,
  },
  {
    key: 'similarityBoost' as const,
    label: 'Similaridade',
    tooltip: 'Quão próximo da voz original. Valores altos preservam mais a voz, baixos permitem mais variação.',
    min: 0, max: 100, step: 1,
  },
  {
    key: 'style' as const,
    label: 'Estilo',
    tooltip: 'Exagero do estilo de fala. Valores altos tornam a voz mais dramática.',
    min: 0, max: 100, step: 1,
  },
  {
    key: 'speed' as const,
    label: 'Velocidade',
    tooltip: 'Velocidade da fala. 1.0 = normal.',
    min: 50, max: 200, step: 5,
    format: (v: number) => `${(v / 100).toFixed(1)}x`,
  },
];

export function AudioControls({ settings, onChange }: AudioControlsProps) {
  const getValue = (key: keyof AudioSettings): number => {
    const v = settings[key];
    if (key === 'speed') return Math.round(v * 100);
    return Math.round(v * 100);
  };

  const setValue = (key: keyof AudioSettings, value: number) => {
    const normalized = key === 'speed' ? value / 100 : value / 100;
    onChange({ ...settings, [key]: normalized });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Controles de Áudio</h3>
        {CONTROLS.map((ctrl) => (
          <div key={ctrl.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-foreground">{ctrl.label}</span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{ctrl.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {ctrl.format
                  ? ctrl.format(getValue(ctrl.key))
                  : `${getValue(ctrl.key)}%`}
              </span>
            </div>
            <Slider
              value={[getValue(ctrl.key)]}
              onValueChange={([v]) => setValue(ctrl.key, v)}
              min={ctrl.min}
              max={ctrl.max}
              step={ctrl.step}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
