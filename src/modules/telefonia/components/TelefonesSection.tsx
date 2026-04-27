import { Card } from "@/components/ui/card";
import { MessageCircle, Phone } from "lucide-react";
import type { NormPhone } from "../types";
import type { Metodo } from "../utils/methodConfig";
import { PhoneCard } from "./PhoneCard";

interface Props {
  phones: NormPhone[];
  metodo: Metodo | string;
  leadContext?: { id: string; name: string } | null;
  onLeadUpdated?: () => void;
}

export function TelefonesSection({ phones, metodo, leadContext, onLeadUpdated }: Props) {
  const showWhats = metodo === "NVBOOK_CEL_OBG_WHATS" || metodo === "NVCHECK_JSON";
  const showHot = metodo === "NVCHECK_JSON";

  if (!phones.length) {
    return (
      <Card className="p-6 text-sm text-muted-foreground text-center">
        Nenhum telefone retornado para este CPF.
      </Card>
    );
  }

  // ordenar: WhatsApp primeiro, depois celulares, depois fixos
  const sorted = [...phones].sort((a, b) => {
    const wA = a.tem_whatsapp === true ? 0 : 1;
    const wB = b.tem_whatsapp === true ? 0 : 1;
    if (wA !== wB) return wA - wB;
    const tA = a.tipo === "celular" ? 0 : 1;
    const tB = b.tipo === "celular" ? 0 : 1;
    return tA - tB;
  });

  const whatsCount = phones.filter((p) => p.tem_whatsapp === true).length;
  const celCount = phones.filter((p) => p.tipo === "celular").length;
  const fixCount = phones.filter((p) => p.tipo === "fixo").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {showWhats && whatsCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 font-medium">
            <MessageCircle className="h-3 w-3" />
            {whatsCount} com WhatsApp
          </div>
        )}
        {celCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
            <Phone className="h-3 w-3" />
            {celCount} celular{celCount !== 1 ? "es" : ""}
          </div>
        )}
        {fixCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
            {fixCount} fixo{fixCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <PhoneCard
            key={p.id || `${p.ddd}${p.numero}-${i}`}
            phone={p}
            index={i}
            showWhats={showWhats}
            showHot={showHot}
            leadContext={leadContext}
            onLeadUpdated={onLeadUpdated}
          />
        ))}
      </div>
    </div>
  );
}
