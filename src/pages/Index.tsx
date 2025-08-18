import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { IndicateClient } from "@/components/IndicateClient";
import { LeadsManagement } from "@/components/LeadsManagement";
import { BaseOffModern } from "@/components/BaseOffModern";
import { Commissions } from "@/components/Commissions";
import { Notifications } from "@/components/Notifications";
import { AdminTest } from "@/components/AdminTest";
import { TestFunctionalities } from "@/components/TestFunctionalities";
import { SystemStatus } from "@/components/SystemStatus";
import { Button } from "@/components/ui/button";
import { Database, LogIn, TestTube, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to <span className="text-primary">Credtz</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Please sign in to access your dashboard
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-4">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "indicate":
        return <IndicateClient />;
      case "leads":
        return <LeadsManagement />;
      case "baseoff":
        return <BaseOffModern />;
      case "commissions":
        return <Commissions />;
      case "notifications":
        return <Notifications />;
      case "test-functionalities":
        return <TestFunctionalities />;
      case "system-status":
        return <SystemStatus />;
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
      
      {/* Admin Test Panel - visible on main page for debugging */}
      <AdminTest />
      
      {/* Botões flutuantes para teste */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-40 flex flex-col gap-3">
        <Button
          onClick={() => setActiveTab("system-status")}
          className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          size="icon"
          title="Status do Sistema"
        >
          <Activity size={20} />
        </Button>
        <Button
          onClick={() => setActiveTab("test-functionalities")}
          className="h-12 w-12 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
          size="icon"
          title="Testar Funcionalidades"
        >
          <TestTube size={20} />
        </Button>
        <Button
          onClick={() => navigate("/test-database")}
          className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary-dark"
          size="icon"
          title="Teste do Banco"
        >
          <Database size={20} />
        </Button>
      </div>
    </div>
  );
};

export default Index;
