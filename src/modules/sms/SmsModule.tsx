import { useState } from "react";
import { RefreshCw, MessageSquare, FileText, History, Users, Phone, Settings, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSmsData } from "./hooks/useSmsData";
import { CampaignsView } from "./views/CampaignsView";
import { TemplatesView } from "./views/TemplatesView";
import { HistoryView } from "./views/HistoryView";
import { ContactsView } from "./views/ContactsView";
import { TelevendasSmsView } from "./views/TelevendasSmsView";
import { AutomationView } from "./views/AutomationView";
import { RemarketingSmsView } from "./views/RemarketingSmsView";
import { SmsTab } from "./types";

const TAB_CONFIG: Record<SmsTab, { icon: typeof Phone; label: string; color: string }> = {
  televendas_sms: { icon: Phone, label: "Televendas", color: "text-blue-500" },
  remarketing: { icon: Megaphone, label: "Remarketing", color: "text-violet-500" },
  automation: { icon: Settings, label: "Automação", color: "text-amber-500" },
  campaigns: { icon: MessageSquare, label: "Disparos", color: "text-emerald-500" },
  templates: { icon: FileText, label: "Templates", color: "text-pink-500" },
  history: { icon: History, label: "Histórico", color: "text-cyan-500" },
  contacts: { icon: Users, label: "Contatos", color: "text-orange-500" },
};

export const SmsModule = () => {
  const [activeTab, setActiveTab] = useState<SmsTab>("televendas_sms");
  const {
    templates, contactLists, campaigns, history, loading,
    refresh, refreshTemplates, refreshContactLists, refreshCampaigns, refreshHistory,
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
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Comunicação SMS</h1>
              <p className="text-xs text-muted-foreground">Gerencie automações, disparos e histórico</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={refresh} className="h-10 w-10 rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SmsTab)} className="w-full">
        <TabsList className="w-full h-auto p-1.5 bg-muted/60 rounded-xl flex flex-wrap gap-1 md:grid md:grid-cols-7">
          {(Object.entries(TAB_CONFIG) as [SmsTab, typeof TAB_CONFIG[SmsTab]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = activeTab === key;
            return (
              <TabsTrigger
                key={key}
                value={key}
                className={`h-10 text-[11px] sm:text-xs font-semibold gap-1.5 rounded-lg transition-all data-[state=active]:shadow-md ${isActive ? "" : ""}`}
              >
                <Icon className={`h-4 w-4 ${isActive ? cfg.color : ""}`} />
                <span className="hidden sm:inline">{cfg.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "televendas_sms" && <TelevendasSmsView />}
          {activeTab === "remarketing" && <RemarketingSmsView />}
          {activeTab === "automation" && <AutomationView />}
          {activeTab === "campaigns" && (
            <CampaignsView campaigns={campaigns} templates={templates} contactLists={contactLists} onRefresh={refreshCampaigns} onRefreshLists={refreshContactLists} />
          )}
          {activeTab === "templates" && <TemplatesView templates={templates} onRefresh={refreshTemplates} />}
          {activeTab === "history" && <HistoryView history={history} onRefresh={refreshHistory} />}
          {activeTab === "contacts" && <ContactsView contactLists={contactLists} onRefresh={refreshContactLists} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SmsModule;
