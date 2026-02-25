import { useState } from "react";
import { RefreshCw, MessageSquare, FileText, History, Users, Phone, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSmsData } from "./hooks/useSmsData";
import { CampaignsView } from "./views/CampaignsView";
import { TemplatesView } from "./views/TemplatesView";
import { HistoryView } from "./views/HistoryView";
import { ContactsView } from "./views/ContactsView";
import { TelevendasSmsView } from "./views/TelevendasSmsView";
import { AutomationView } from "./views/AutomationView";
import { SmsTab } from "./types";

export const SmsModule = () => {
  const [activeTab, setActiveTab] = useState<SmsTab>("televendas_sms");
  const {
    templates,
    contactLists,
    campaigns,
    history,
    loading,
    refresh,
    refreshTemplates,
    refreshContactLists,
    refreshCampaigns,
    refreshHistory,
  } = useSmsData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Comunicação SMS</h1>
        </div>
        <Button variant="outline" size="icon" onClick={refresh} className="h-10 w-10 rounded-xl">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SmsTab)} className="w-full">
        <TabsList className="w-full h-14 p-1.5 bg-muted rounded-xl grid grid-cols-6">
          <TabsTrigger value="televendas_sms" className="h-full text-[11px] sm:text-sm font-semibold gap-1 rounded-lg data-[state=active]:shadow-md">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Televendas</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="h-full text-[11px] sm:text-sm font-semibold gap-1 rounded-lg data-[state=active]:shadow-md">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Automação</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="h-full text-[11px] sm:text-sm font-semibold gap-1 rounded-lg data-[state=active]:shadow-md">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Disparos</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="h-full text-[11px] sm:text-sm font-semibold gap-1 rounded-lg data-[state=active]:shadow-md">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="h-full text-[11px] sm:text-sm font-semibold gap-1 rounded-lg data-[state=active]:shadow-md">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="h-full text-[11px] sm:text-sm font-semibold gap-1 rounded-lg data-[state=active]:shadow-md">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Contatos</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {activeTab === "televendas_sms" && <TelevendasSmsView />}
      {activeTab === "automation" && <AutomationView />}
      {activeTab === "campaigns" && (
        <CampaignsView
          campaigns={campaigns}
          templates={templates}
          contactLists={contactLists}
          onRefresh={refreshCampaigns}
          onRefreshLists={refreshContactLists}
        />
      )}
      {activeTab === "templates" && (
        <TemplatesView templates={templates} onRefresh={refreshTemplates} />
      )}
      {activeTab === "history" && <HistoryView history={history} onRefresh={refreshHistory} />}
      {activeTab === "contacts" && (
        <ContactsView contactLists={contactLists} onRefresh={refreshContactLists} />
      )}
    </div>
  );
};

export default SmsModule;
