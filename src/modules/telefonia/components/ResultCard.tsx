import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DadosCadastraisSection } from "./DadosCadastraisSection";
import { TelefonesSection } from "./TelefonesSection";
import { EnderecosSection } from "./EnderecosSection";
import { PerfilCompletoSection } from "./PerfilCompletoSection";
import type { NormPhone } from "../types";

interface Props {
  metodo: string;
  resultado: any;
  telefones: NormPhone[];
  leadContext?: { id: string; name: string } | null;
  onLeadUpdated?: () => void;
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition">
          <span className="font-medium">{title}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ResultCard({ metodo, resultado, telefones, leadContext, onLeadUpdated }: Props) {
  return (
    <div className="space-y-3">
      <Section title="Dados Cadastrais" defaultOpen>
        <DadosCadastraisSection resultado={resultado} metodo={metodo} />
      </Section>
      <Section title={`Telefones (${telefones.length})`} defaultOpen>
        <TelefonesSection
          phones={telefones}
          metodo={metodo}
          leadContext={leadContext}
          onLeadUpdated={onLeadUpdated}
        />
      </Section>
      <Section title="Endereços">
        <EnderecosSection resultado={resultado} metodo={metodo} />
      </Section>
      {metodo === "NVCHECK_JSON" && (
        <Section title="Perfil Completo">
          <PerfilCompletoSection resultado={resultado} />
        </Section>
      )}
    </div>
  );
}
