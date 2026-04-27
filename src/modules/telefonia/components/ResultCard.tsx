import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DadosCadastraisSection } from "./DadosCadastraisSection";
import { TelefonesSection } from "./TelefonesSection";
import { EnderecosSection } from "./EnderecosSection";
import { PerfilCompletoSection } from "./PerfilCompletoSection";
import { ScoreBadge } from "./ScoreBadge";
import { formatCpf } from "../utils/cpfMask";
import type { NormPhone } from "../types";

interface Props {
  metodo: string;
  resultado: any;
  telefones: NormPhone[];
  leadContext?: { id: string; name: string } | null;
  onLeadUpdated?: () => void;
}

function getStr(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object" && v._text) return String(v._text).trim() || null;
  return String(v);
}

function Section({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition">
          <span className="font-medium flex items-center gap-2">
            {title}
            {count !== undefined && (
              <Badge variant="secondary" className="text-[10px]">
                {count}
              </Badge>
            )}
          </span>
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
  // extract header data from any of the response shapes
  const cad =
    metodo === "NVCHECK_JSON"
      ? resultado?.d?.CONSULTA?.CADASTRAIS ?? resultado?.CONSULTA?.CADASTRAIS
      : resultado?.CONSULTA?.CADASTRO;

  const nome = getStr(cad?.NOME);
  const cpfRaw = getStr(cad?.CPF) || getStr(cad?.DOCUMENTO);
  const idade = getStr(cad?.IDADE);
  const score = getStr(cad?.SCORE) || getStr(resultado?.d?.CONSULTA?.CREDITO?.SCORE);

  // first endereco
  let cidade: string | null = null;
  let uf: string | null = null;
  const enderecos = resultado?.CONSULTA?.ENDERECOS ?? resultado?.d?.CONSULTA?.ENDERECOS;
  const first = Array.isArray(enderecos)
    ? enderecos[0]
    : enderecos?.ENDERECO
      ? Array.isArray(enderecos.ENDERECO)
        ? enderecos.ENDERECO[0]
        : enderecos.ENDERECO
      : enderecos;
  cidade = getStr(first?.CIDADE);
  uf = getStr(first?.UF);

  const enderecosCount = Array.isArray(enderecos)
    ? enderecos.length
    : enderecos?.ENDERECO
      ? Array.isArray(enderecos.ENDERECO)
        ? enderecos.ENDERECO.length
        : 1
      : 0;

  return (
    <div className="space-y-3">
      {/* Hero header */}
      {nome && (
        <Card className="p-4 sm:p-5 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg sm:text-xl font-bold leading-tight">{nome}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                {cpfRaw && (
                  <span className="font-mono">CPF: {formatCpf(cpfRaw)}</span>
                )}
                {idade && <span>{idade} anos</span>}
                {(cidade || uf) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[cidade, uf].filter(Boolean).join("/")}
                  </span>
                )}
              </div>
            </div>
            {score && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-0.5">Score</div>
                <ScoreBadge score={score} />
              </div>
            )}
          </div>
        </Card>
      )}

      <Section title="Telefones" count={telefones.length} defaultOpen>
        <TelefonesSection
          phones={telefones}
          metodo={metodo}
          leadContext={leadContext}
          onLeadUpdated={onLeadUpdated}
        />
      </Section>
      <Section title="Dados Cadastrais" defaultOpen={!nome}>
        <DadosCadastraisSection resultado={resultado} metodo={metodo} />
      </Section>
      <Section title="Endereços" count={enderecosCount}>
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
