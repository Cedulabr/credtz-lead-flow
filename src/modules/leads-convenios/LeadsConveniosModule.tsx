import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadsConvenios } from "./hooks/useLeadsConvenios";
import { ConvenioLeadCard } from "./components/ConvenioLeadCard";
import { LeadDetailDrawer } from "../leads-premium/components/LeadDetailDrawer";
import { Button } from "@/components/ui/button";
import { ImportBase } from "@/components/ImportBase";
import { RequestLeadsWizard } from "../leads-premium/components/RequestLeadsWizard";
import { Upload, RefreshCw, Loader2, Plus, CreditCard } from "lucide-react";

export function LeadsConveniosModule() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { leads, isLoading, userCredits, fetchLeads, updateLeadStatus, requestLeads } = useLeadsConvenios();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const handleRequestLeads = async (options: any) => {
    const success = await requestLeads(options);
    if (success) setIsRequestModalOpen(false);
    return success;
  };

  const handleLeadClick = (lead: any) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  if (showImport && isAdmin) {
    return <ImportBase onBack={() => setShowImport(false)} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Convênios</h1>
          <p className="text-muted-foreground">Gestão de leads com visualização avançada de margem e empréstimos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchLeads()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar Base
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map(lead => (
            <ConvenioLeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} />
          ))}
          {leads.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground">Nenhum lead encontrado neste módulo.</p>
            </div>
          )}
        </div>
      )}

      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onStatusChange={(id, status) => updateLeadStatus(id, status)}
        canEdit={true}
        users={[]}
      />
    </div>
  );
}

import { cn } from "@/lib/utils";
