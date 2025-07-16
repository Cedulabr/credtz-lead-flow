import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { IndicateClient } from "@/components/IndicateClient";
import { LeadsManagement } from "@/components/LeadsManagement";
import { Commissions } from "@/components/Commissions";
import { Notifications } from "@/components/Notifications";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "indicate":
        return <IndicateClient />;
      case "leads":
        return <LeadsManagement />;
      case "commissions":
        return <Commissions />;
      case "notifications":
        return <Notifications />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 md:ml-0">
          {renderActiveComponent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
