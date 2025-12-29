import { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { IndicateClient } from "@/components/IndicateClient";
import IndicatedClientsTracking from "@/components/IndicatedClientsTracking";
import { Notifications } from "@/components/Notifications";
import { BlockedAccess } from "@/components/BlockedAccess";
import { SystemStatus } from "@/components/SystemStatus";
import { TelevendasForm } from "@/components/TelevendasForm";
import { TelevendasManagement } from "@/components/TelevendasManagement";
import { CommissionTable } from "@/components/CommissionTable";
import { ClientDocuments } from "@/components/ClientDocuments";
import { MyClientsKanban } from "@/components/MyClientsKanban";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Database, LogIn, TestTube, Activity } from "lucide-react";
import LoadingAuth from "@/components/LoadingAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useWhitelabel } from "@/hooks/useWhitelabel";

// Lazy load heavy components for better performance
import { 
  LazyLeadsManagement, 
  LazyCommissions, 
  LazyTestFunctionalities 
} from "@/components/LazyComponents";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading } = useAuth();
  const { companyName } = useWhitelabel();

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
            Welcome to <span className="text-primary">{companyName}</span>
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
        // Check if user has access to premium leads
        if (!isAdmin && profile?.can_access_premium_leads === false) {
          return <BlockedAccess message="Acesso bloqueado pelo administrador" />;
        }
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LazyLeadsManagement />
          </Suspense>
        );
      case "my-clients":
        return <MyClientsKanban />;
      case "documents":
        return <ClientDocuments />;
      case "televendas":
        return (
          <div className="p-4">
            <TelevendasForm />
          </div>
        );
      case "televendas-manage":
        return (
          <div className="p-4">
            <TelevendasManagement />
          </div>
        );
      case "commission-table":
        return (
          <div className="p-4">
            <CommissionTable />
          </div>
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
      
    </div>
  );
};

export default Index;
