import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { IndicateClient } from "@/components/IndicateClient";
import { LeadsManagement } from "@/components/LeadsManagement";
import { Commissions } from "@/components/Commissions";
import { Notifications } from "@/components/Notifications";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

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
      
      {/* Botão flutuante para teste do banco */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
        <Button
          onClick={() => navigate("/test-database")}
          className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary-dark"
          size="icon"
        >
          <Database size={20} />
        </Button>
      </div>
    </div>
  );
};

export default Index;
