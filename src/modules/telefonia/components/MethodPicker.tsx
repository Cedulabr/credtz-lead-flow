import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, Phone, Sparkles, Check } from "lucide-react";
import type { Metodo } from "../utils/methodConfig";

interface Props {
  value: Metodo;
  onChange: (m: Metodo) => void;
}

const cards: Array<{
  value: Metodo;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  recommended?: boolean;
  highlight?: boolean;
  bullets: string[];
}> = [
  {
    value: "NVBOOK_CEL_OBG_WHATS",
    title: "Celular + WhatsApp",
    subtitle: "Recomendado para prospecção",
    icon: <MessageCircle className="h-5 w-5" />,
    recommended: true,
    bullets: ["Telefones com WhatsApp", "Procon", "Score básico"],
  },
  {
    value: "NVBOOK_CEL_OBG",
    title: "Celular",
    subtitle: "Telefones cadastrados",
    icon: <Phone className="h-5 w-5" />,
    bullets: ["Celulares e fixos", "Procon", "Sem indicação WhatsApp"],
  },
  {
    value: "NVCHECK_JSON",
    title: "Perfil 360º",
    subtitle: "Consulta completa",
    icon: <Sparkles className="h-5 w-5" />,
    highlight: true,
    bullets: ["Score detalhado + propensão", "Empresas, PEP, óbito", "Pessoas ligadas"],
  },
];

export function MethodPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              "text-left rounded-lg border-2 transition-all p-3 sm:p-4 relative bg-card hover:shadow-md",
              active
                ? "border-primary shadow-sm ring-2 ring-primary/20"
                : "border-border hover:border-primary/50",
            )}
          >
            {active && (
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <div
                className={cn(
                  "h-9 w-9 rounded-md flex items-center justify-center",
                  c.highlight
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-primary/10 text-primary",
                )}
              >
                {c.icon}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm leading-tight">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.subtitle}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {c.recommended && (
                <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                  Recomendado
                </Badge>
              )}
              {c.highlight && (
                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                  Mais completo
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                1 crédito
              </Badge>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {c.bullets.map((b) => (
                <li key={b} className="flex items-start gap-1">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
