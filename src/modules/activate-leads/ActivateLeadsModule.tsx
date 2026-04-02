import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ActivateOverdueBanner } from "./components/ActivateOverdueBanner";
import { useActivateOverdueLeads } from "./hooks/useActivateOverdueLeads";
import { useActivateLeads } from "./hooks/useActivateLeads";
import { ActivatePipelineView } from "./views/ActivatePipelineView";
import { ActivateMetricsView } from "./views/ActivateMetricsView";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, BarChart3, Calculator, Zap } from "lucide-react";

import { ActivateLeads as OriginalActivateLeads } from "@/components/ActivateLeads";

export function ActivateLeadsModule() {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<"list" | "pipeline" | "metrics" | "simulations">("list");
  const { overdueLeads } = useActivateOverdueLeads();
  const { leads, stats, users, isLoading, updateStatus, refetch } = useActivateLeads();

  const viewButtons = (
    <div className="flex items-center gap-2 border-b pb-2 px-4 md:px-6 pt-4">
      {(["list", "pipeline", "metrics", "simulations"] as const).map((v) => {
        const icons = { list: List, pipeline: LayoutGrid, metrics: BarChart3, simulations: Calculator };
        const labels = { list: "Lista", pipeline: "Pipeline", metrics: "Métricas", simulations: "Simulações" };
        const Icon = icons[v];
        return (
          <Button key={v} variant={activeView === v ? "default" : "ghost"} size="sm" onClick={() => setActiveView(v)} className="shrink-0">
            <Icon className="h-4 w-4 mr-1" />
            {labels[v]}
          </Button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-0">
      {overdueLeads.length > 0 && (
        <div className="px-4 md:px-6 pt-4">
          <ActivateOverdueBanner overdueLeads={overdueLeads} />
        </div>
      )}

      {viewButtons}

      {activeView === "list" && <OriginalActivateLeads />}

      {activeView === "pipeline" && (
        <div className="p-4 md:p-6">
          <ActivatePipelineView
            leads={leads}
            users={users}
            isLoading={isLoading}
            onLeadSelect={(lead) => {/* TODO: open detail */}}
            onStatusChange={(lead, newStatus) => updateStatus(lead, newStatus)}
          />
        </div>
      )}

      {activeView === "metrics" && (
        <ActivateMetricsView leads={leads} stats={stats} />
      )}

      {activeView === "simulations" && (
        <div className="p-4 md:p-6">
          <div className="text-center text-muted-foreground py-8">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Simulações</p>
            <p className="text-sm">Acesse a aba Lista para gerenciar simulações.</p>
          </div>
        </div>
      )}
    </div>
  );
}
