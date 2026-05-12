import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcwDot } from "lucide-react";
import {
  useReaproveitamento,
  useReativadasHoje,
  useReativarProposta,
} from "./hooks/useReaproveitamento";
import { KpiCards } from "./components/KpiCards";
import { FilterBar } from "./components/FilterBar";
import { PropostaCard } from "./components/PropostaCard";
import { PropostaDrawer } from "./components/PropostaDrawer";
import { daysSince } from "./utils/avatarColor";
import type { PropostaCancelada, ReaproveitamentoTab } from "./types";

export function ReaproveitamentoModule() {
  const { data: propostas = [], isLoading } = useReaproveitamento();
  const { data: reativadasHoje = 0 } = useReativadasHoje();
  const reativar = useReativarProposta();

  const [search, setSearch] = useState("");
  const [motivo, setMotivo] = useState("all");
  const [periodo, setPeriodo] = useState("all");
  const [tab, setTab] = useState<ReaproveitamentoTab>("todas");
  const [drawerProposta, setDrawerProposta] = useState<PropostaCancelada | null>(null);

  const motivos = useMemo(() => {
    const set = new Set<string>();
    propostas.forEach((p) => p.motivo_cancelamento && set.add(p.motivo_cancelamento));
    return Array.from(set).sort();
  }, [propostas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const periodDays = periodo === "all" ? null : Number(periodo);

    return propostas.filter((p) => {
      if (q) {
        const hay = `${p.nome} ${p.cpf ?? ""} ${p.banco ?? ""} ${p.tipo_operacao ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (motivo !== "all" && p.motivo_cancelamento !== motivo) return false;
      if (periodDays !== null) {
        const d = daysSince(p.data_cancelamento ?? p.created_at);
        if (d > periodDays) return false;
      }
      const score = p.reativacao_score ?? 0;
      const valor = Number(p.troco ?? p.saldo_devedor ?? 0);
      const dias = daysSince(p.data_cancelamento ?? p.created_at);
      switch (tab) {
        case "quentes": return score >= 80;
        case "recentes": return dias <= 30;
        case "alto_valor": return valor >= 5000;
        default: return true;
      }
    });
  }, [propostas, search, motivo, periodo, tab]);

  const reativatingId = reativar.isPending ? reativar.variables?.id : null;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <RefreshCcwDot className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Reaproveitamento</h1>
            <p className="text-xs text-muted-foreground">
              Recupere propostas canceladas com score de IA.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {propostas.length} canceladas
        </Badge>
      </header>

      <KpiCards propostas={propostas} reativadasHoje={reativadasHoje} />

      <FilterBar
        search={search}
        onSearch={setSearch}
        motivo={motivo}
        onMotivo={setMotivo}
        periodo={periodo}
        onPeriodo={setPeriodo}
        motivos={motivos}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReaproveitamentoTab)}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="quentes">🔥 Quentes</TabsTrigger>
          <TabsTrigger value="recentes">Recentes (≤30d)</TabsTrigger>
          <TabsTrigger value="alto_valor">Alto valor (≥ R$ 5k)</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border rounded-xl bg-muted/30">
          Nenhuma proposta encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PropostaCard
              key={p.id}
              proposta={p}
              onReativar={(prop) => reativar.mutate(prop)}
              onView={setDrawerProposta}
              isReativating={reativatingId === p.id}
            />
          ))}
        </div>
      )}

      <PropostaDrawer
        proposta={drawerProposta}
        open={!!drawerProposta}
        onOpenChange={(v) => !v && setDrawerProposta(null)}
        onReativar={(prop) => {
          reativar.mutate(prop);
          setDrawerProposta(null);
        }}
        isReativating={!!reativatingId && reativatingId === drawerProposta?.id}
      />
    </div>
  );
}

export default ReaproveitamentoModule;
