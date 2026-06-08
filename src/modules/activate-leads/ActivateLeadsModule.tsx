import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ActivateOverdueBanner } from "./components/ActivateOverdueBanner";
import { useActivateOverdueLeads } from "./hooks/useActivateOverdueLeads";
import { useActivateLeads } from "./hooks/useActivateLeads";
import { ActivatePipelineView } from "./views/ActivatePipelineView";
import { ActivateMetricsView } from "./views/ActivateMetricsView";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, BarChart3, Calculator, Zap, HelpCircle } from "lucide-react";
import { ActivateGuidedFlow } from "./components/ActivateGuidedFlow";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { ActivateLeads as OriginalActivateLeads } from "@/components/ActivateLeads";

export function ActivateLeadsModule() {
  const { profile } = useAuth();
  const [activeView, setActiveView] = useState<string>("list");
  const [showGuide, setShowGuide] = useState(false);
  const { overdueLeads } = useActivateOverdueLeads();
  const { leads, stats, users, origens, isLoading, updateStatus, refetch } = useActivateLeads();

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header Area */}
      <div className="bg-background border-b px-4 md:px-8 py-4 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary fill-primary/20" />
              Ativar Leads
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestão inteligente e prospecção ativa de novos clientes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowGuide(!showGuide)}
              className={cn(showGuide && "bg-primary/10 border-primary text-primary")}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {showGuide ? "Ocultar Guia" : "Como funciona?"}
            </Button>
            <Button size="sm" className="hidden md:flex">
              <Zap className="h-4 w-4 mr-2" />
              Ação Rápida
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto space-y-6 p-4 md:p-8">
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <ActivateGuidedFlow />
              </motion.div>
            )}
          </AnimatePresence>

          {overdueLeads.length > 0 && (
            <ActivateOverdueBanner overdueLeads={overdueLeads} />
          )}

          <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
            <div className="flex items-center justify-between border-b pb-1">
              <TabsList className="bg-transparent h-auto p-0 gap-6">
                <TabsTrigger 
                  value="list" 
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 h-auto"
                >
                  <List className="h-4 w-4 mr-2" /> Lista
                </TabsTrigger>
                <TabsTrigger 
                  value="pipeline" 
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 h-auto"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" /> Pipeline
                </TabsTrigger>
                <TabsTrigger 
                  value="metrics" 
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 h-auto"
                >
                  <BarChart3 className="h-4 w-4 mr-2" /> Métricas
                </TabsTrigger>
                <TabsTrigger 
                  value="simulations" 
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-1 pb-2 h-auto"
                >
                  <Calculator className="h-4 w-4 mr-2" /> Simulações
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-0 focus-visible:outline-none">
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <OriginalActivateLeads />
              </motion.div>
            </TabsContent>

            <TabsContent value="pipeline" className="mt-0 focus-visible:outline-none">
              <ActivatePipelineView
                leads={leads}
                users={users}
                stats={stats}
                origens={origens}
                isLoading={isLoading}
                onLeadSelect={(lead) => {/* TODO: open detail */}}
                onStatusChange={(lead, newStatus) => updateStatus(lead, newStatus)}
              />
            </TabsContent>

            <TabsContent value="metrics" className="mt-0 focus-visible:outline-none">
              <ActivateMetricsView leads={leads} stats={stats} />
            </TabsContent>

            <TabsContent value="simulations" className="mt-0 focus-visible:outline-none">
              <div className="bg-card rounded-xl border p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <Calculator className="h-8 w-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-xl font-bold">Gerenciamento de Simulações</h3>
                  <p className="text-muted-foreground">
                    Acompanhe todas as solicitações de simulação enviadas para análise técnica.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setActiveView("list")}>
                  Ir para Lista de Leads
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Support floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="icon" className="h-12 w-12 rounded-full shadow-xl hover:scale-110 transition-transform">
          <HelpCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
