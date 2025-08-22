import { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { IndicateClient } from "@/components/IndicateClient";
import IndicatedClientsTracking from "@/components/IndicatedClientsTracking";
import { Notifications } from "@/components/Notifications";
import { AdminTest } from "@/components/AdminTest";
import { SystemStatus } from "@/components/SystemStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Database, LogIn, TestTube, Activity } from "lucide-react";
import LoadingAuth from "@/components/LoadingAuth";
import { useAuth } from "@/contexts/AuthContext";

// Lazy load heavy components for better performance
import { 
  LazyLeadsManagement, 
  LazyCommissions, 
  LazyTestFunctionalities 
} from "@/components/LazyComponents";

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
    return <LoadingAuth />;
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
    // Loading skeleton for lazy components
    const LoadingFallback = () => (
      <Card className="m-4">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );

    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "indicate":
        return (
          <div className="space-y-6">
            <IndicateClient />
            <IndicatedClientsTracking />
          </div>
        );
      case "leads":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LazyLeadsManagement />
          </Suspense>
        );
      case "commissions":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LazyCommissions />
          </Suspense>
        );
      case "notifications":
        return <Notifications />;
      case "test-functionalities":
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LazyTestFunctionalities />
          </Suspense>
        );
      case "system-status":
        return <SystemStatus />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile: Full width layout, Desktop: Sidebar + Content */}
      <div className="flex md:flex">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 w-full md:w-auto">
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
