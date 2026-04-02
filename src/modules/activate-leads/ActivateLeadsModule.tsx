import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ActivateOverdueBanner } from "./components/ActivateOverdueBanner";
import { useActivateOverdueLeads } from "./hooks/useActivateOverdueLeads";
import { ActivatePipelineView } from "./views/ActivatePipelineView";
import { ActivateMetricsView } from "./views/ActivateMetricsView";
import { ActivateLeadStats, ACTIVATE_STATUS_CONFIG } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LayoutGrid, List, BarChart3, Calculator, Zap, Upload, Download, History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Re-export the old component's functionality - the actual ActivateLeads.tsx still handles
// all the complex logic (imports, CSV parsing, modals etc). This module wraps it with 
// new UI chrome: tabs, pipeline view, metrics, 48h banner.

// We import the original component lazily for the "Lista" tab
import { ActivateLeads as OriginalActivateLeads } from "@/components/ActivateLeads";

export function ActivateLeadsModule() {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<"list" | "pipeline" | "metrics" | "simulations">("list");

  const { overdueLeads, isBlocked } = useActivateOverdueLeads();

  // The original component handles everything for "list" view
  // For pipeline/metrics, we'll render new views
  // Since the original component is monolithic and contains all state/logic,
  // we render it always but show/hide based on active view

  if (activeView === "list") {
    return (
      <div className="space-y-0">
        {/* 48h Overdue Banner */}
        {overdueLeads.length > 0 && (
          <div className="px-4 md:px-6 pt-4">
            <ActivateOverdueBanner overdueLeads={overdueLeads} />
          </div>
        )}

        {/* View Tabs */}
        <div className="px-4 md:px-6 pt-4 pb-2 flex items-center gap-2 border-b">
          <Button variant="default" size="sm" className="shrink-0">
            <List className="h-4 w-4 mr-1" />
            Lista
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setActiveView("pipeline")} className="shrink-0">
            <LayoutGrid className="h-4 w-4 mr-1" />
            Pipeline
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setActiveView("metrics")} className="shrink-0">
            <BarChart3 className="h-4 w-4 mr-1" />
            Métricas
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setActiveView("simulations")} className="shrink-0">
            <Calculator className="h-4 w-4 mr-1" />
            Simulações
          </Button>
        </div>

        {/* Original Activate Leads component */}
        <OriginalActivateLeads />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* 48h Overdue Banner */}
      {overdueLeads.length > 0 && (
        <ActivateOverdueBanner overdueLeads={overdueLeads} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Activate Leads
          </h1>
          <p className="text-muted-foreground">
            Gerencie e ative seus leads de múltiplas fontes
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button variant="ghost" size="sm" onClick={() => setActiveView("list")} className="shrink-0">
          <List className="h-4 w-4 mr-1" />
          Lista
        </Button>
        <Button variant={activeView === "pipeline" ? "default" : "ghost"} size="sm" onClick={() => setActiveView("pipeline")} className="shrink-0">
          <LayoutGrid className="h-4 w-4 mr-1" />
          Pipeline
        </Button>
        <Button variant={activeView === "metrics" ? "default" : "ghost"} size="sm" onClick={() => setActiveView("metrics")} className="shrink-0">
          <BarChart3 className="h-4 w-4 mr-1" />
          Métricas
        </Button>
        <Button variant={activeView === "simulations" ? "default" : "ghost"} size="sm" onClick={() => setActiveView("simulations")} className="shrink-0">
          <Calculator className="h-4 w-4 mr-1" />
          Simulações
        </Button>
      </div>

      {/* Views */}
      {activeView === "pipeline" && (
        <div className="text-center text-muted-foreground py-8">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Pipeline Kanban</p>
          <p className="text-sm">Acesse a aba Lista para gerenciar seus leads com todas as funcionalidades.</p>
          <p className="text-sm mt-2">O pipeline visual será integrado em breve com drag-and-drop.</p>
        </div>
      )}

      {activeView === "metrics" && (
        <div className="text-center text-muted-foreground py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Métricas</p>
          <p className="text-sm">Acesse a aba Lista para ver estatísticas dos seus leads.</p>
        </div>
      )}

      {activeView === "simulations" && (
        <div className="text-center text-muted-foreground py-8">
          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Simulações</p>
          <p className="text-sm">Acesse a aba Lista para gerenciar simulações.</p>
        </div>
      )}
    </div>
  );
}
