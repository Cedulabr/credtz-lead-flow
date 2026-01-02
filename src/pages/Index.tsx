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
import { MyClientsList } from "@/components/MyClientsList";
import { FinanceKanban } from "@/components/FinanceKanban";
import { ProposalGenerator } from "@/components/ProposalGenerator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import LoadingAuth from "@/components/LoadingAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useWhitelabel } from "@/hooks/useWhitelabel";

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

  const hasPermission = (permissionKey: string): boolean => {
    if (isAdmin) return true;
    const profileData = profile as any;
    return profileData?.[permissionKey] !== false;
  };

  const renderActiveComponent = () => {
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
        if (!hasPermission('can_access_indicar')) {
          return <BlockedAccess message="Acesso à seção Indicar bloqueado pelo administrador" />;
        }
        return (
          <div className="space-y-6">
            <IndicateClient />
            <IndicatedClientsTracking />
          </div>
        );
      
      case "proposal-generator":
        if (!hasPermission('can_access_gerador_propostas')) {
          return <BlockedAccess message="Acesso ao Gerador de Propostas bloqueado pelo administrador" />;
        }
        return <ProposalGenerator />;
      
      case "leads":
        if (!hasPermission('can_access_premium_leads')) {
          return <BlockedAccess message="Acesso aos Leads Premium bloqueado pelo administrador" />;
        }
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LazyLeadsManagement />
          </Suspense>
        );
      
      case "my-clients":
        if (!hasPermission('can_access_meus_clientes')) {
          return <BlockedAccess message="Acesso à seção Meus Clientes bloqueado pelo administrador" />;
        }
        return <MyClientsList />;
      
      case "documents":
        if (!hasPermission('can_access_documentos')) {
          return <BlockedAccess message="Acesso à seção Documentos bloqueado pelo administrador" />;
        }
        return <ClientDocuments />;
      
      case "televendas":
        if (!hasPermission('can_access_televendas')) {
          return <BlockedAccess message="Acesso à seção Televendas bloqueado pelo administrador" />;
        }
        return (
          <div className="p-4">
            <TelevendasForm />
          </div>
        );
      
      case "televendas-manage":
        if (!hasPermission('can_access_gestao_televendas')) {
          return <BlockedAccess message="Acesso à Gestão de Televendas bloqueado pelo administrador" />;
        }
        return (
          <div className="p-4">
            <TelevendasManagement />
          </div>
        );
      
      case "finances":
        if (!hasPermission('can_access_financas')) {
          return <BlockedAccess message="Acesso à seção Finanças bloqueado pelo administrador" />;
        }
        return <FinanceKanban />;
      
      case "commission-table":
        if (!hasPermission('can_access_tabela_comissoes')) {
          return <BlockedAccess message="Acesso à Tabela de Comissões bloqueado pelo administrador" />;
        }
        return (
          <div className="p-4">
            <CommissionTable />
          </div>
        );
      
      case "commissions":
        if (!hasPermission('can_access_minhas_comissoes')) {
          return <BlockedAccess message="Acesso a Minhas Comissões bloqueado pelo administrador" />;
        }
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
