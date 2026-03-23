import { useState, useEffect, useMemo, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWhitelabel } from "@/hooks/useWhitelabel";

// ── Light imports (always loaded) ─────────────────────────────────────
import { Navigation } from "@/components/Navigation";
import LoadingAuth from "@/components/LoadingAuth";
import { BlockedAccess } from "@/components/BlockedAccess";
import { LoadingFallback } from "@/components/LoadingFallback";

// ── All heavy modules via lazy loading ────────────────────────────────
import {
  LazyDashboard,
  LazyIndicateClient,
  LazyProposalGenerator,
  LazyActivateLeads,
  LazyLeadsManagement,
  LazyBaseOffModule,
  LazyMyClientsList,
  LazyClientDocuments,
  LazySalesWizard,
  LazyTelevendasModule,
  LazyFinanceKanban,
  LazyCommissionTable,
  LazyCommissions,
  LazyOpportunitiesModule,
  LazyPerformanceReport,
  LazyCollaborative,
  LazyTimeClock,
  LazySmsModule,
  LazyWhatsAppConfig,
  LazyMeuNumeroModule,
  LazyNotifications,
  LazyTestFunctionalities,
  LazySystemStatus,
  LazyMyData,
  LazyRadarModule,
  LazyAutoLeadModule,
  LazyDigitacaoModule,
  LazyAudiosModule,
  LazyPortFlowModule,
} from "@/components/LazyComponents";

// ── Types ─────────────────────────────────────────────────────────────
type TabConfig = {
  permission?: string;
  blockedMessage?: string;
  wrapP4?: boolean;
};

// ── Permission-only config (no components here — built in useMemo) ───
const TAB_PERMISSIONS: Record<string, Pick<TabConfig, 'permission' | 'blockedMessage' | 'wrapP4'>> = {
  indicate: {
    permission: 'can_access_indicar',
    blockedMessage: 'Acesso à seção Indicar bloqueado pelo administrador',
  },
  'proposal-generator': {
    permission: 'can_access_gerador_propostas',
    blockedMessage: 'Acesso ao Gerador de Propostas bloqueado pelo administrador',
  },
  'activate-leads': {
    permission: 'can_access_activate_leads',
    blockedMessage: 'Acesso ao Activate Leads bloqueado pelo administrador',
  },
  leads: {
    permission: 'can_access_premium_leads',
    blockedMessage: 'Acesso aos Leads Premium bloqueado pelo administrador',
  },
  'my-clients': {
    permission: 'can_access_meus_clientes',
    blockedMessage: 'Acesso à seção Meus Clientes bloqueado pelo administrador',
  },
  documents: {
    permission: 'can_access_documentos',
    blockedMessage: 'Acesso à seção Documentos bloqueado pelo administrador',
  },
  televendas: {
    permission: 'can_access_televendas',
    blockedMessage: 'Acesso à seção Televendas bloqueado pelo administrador',
    wrapP4: true,
  },
  'televendas-manage': {
    permission: 'can_access_gestao_televendas',
    blockedMessage: 'Acesso à Gestão de Televendas bloqueado pelo administrador',
  },
  finances: {
    permission: 'can_access_financas',
    blockedMessage: 'Acesso à seção Finanças bloqueado pelo administrador',
  },
  'commission-table': {
    permission: 'can_access_tabela_comissoes',
    blockedMessage: 'Acesso à Tabela de Comissões bloqueado pelo administrador',
    wrapP4: true,
  },
  commissions: {
    permission: 'can_access_minhas_comissoes',
    blockedMessage: 'Acesso a Minhas Comissões bloqueado pelo administrador',
  },
  'reuse-alerts': {
    permission: 'can_access_alertas',
    blockedMessage: 'Acesso ao Painel de Oportunidades bloqueado pelo administrador',
  },
  sms: {
    permission: 'can_access_sms',
    blockedMessage: 'Acesso ao módulo SMS bloqueado pelo administrador',
  },
  whatsapp: {
    permission: 'can_access_whatsapp',
    blockedMessage: 'Acesso ao módulo WhatsApp bloqueado pelo administrador',
  },
  'meu-numero': {
    permission: 'can_access_meu_numero',
    blockedMessage: 'Acesso ao módulo Meu Número bloqueado pelo administrador',
  },
  radar: {
    permission: 'can_access_radar',
    blockedMessage: 'Acesso ao Radar de Oportunidades bloqueado pelo administrador',
  },
  autolead: {
    permission: 'can_access_autolead',
    blockedMessage: 'Acesso ao AutoLead bloqueado pelo administrador',
  },
  digitacao: {
    permission: 'can_access_digitacao',
    blockedMessage: 'Acesso à Digitação bloqueado pelo administrador',
  },
  audios: {
    permission: 'can_access_audios',
    blockedMessage: 'Acesso ao módulo Áudios bloqueado pelo administrador',
  },
};

// ── Main Component ────────────────────────────────────────────────────
const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading } = useAuth();
  const { companyName } = useWhitelabel();

  // ── Auth redirect ───────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // ── Permission helper (deny-by-default) ─────────────────────────────
  const hasPermission = (permissionKey: string): boolean => {
    if (isAdmin) return true;
    const profileData = profile as any;
    return profileData?.[permissionKey] === true;
  };

  // ── Declarative tab → component map (memoized) ─────────────────────
  const tabComponents = useMemo(() => ({
    dashboard: <LazyDashboard onNavigate={setActiveTab} />,
    'my-data': <div className="p-4"><LazyMyData /></div>,
    indicate: <LazyIndicateClient />,
    'proposal-generator': <LazyProposalGenerator />,
    'activate-leads': <LazyActivateLeads />,
    leads: <LazyLeadsManagement />,
    'baseoff-consulta': <LazyBaseOffModule />,
    'my-clients': <LazyMyClientsList />,
    documents: <LazyClientDocuments />,
    televendas: <div className="p-4"><LazySalesWizard /></div>,
    'televendas-manage': <LazyTelevendasModule />,
    finances: <LazyFinanceKanban />,
    'commission-table': <div className="p-4"><LazyCommissionTable /></div>,
    commissions: <LazyCommissions />,
    'reuse-alerts': <LazyOpportunitiesModule />,
    'performance-report': <LazyPerformanceReport />,
    collaborative: <LazyCollaborative />,
    'time-clock': <LazyTimeClock />,
    sms: <LazySmsModule />,
    whatsapp: <LazyWhatsAppConfig />,
    'meu-numero': <LazyMeuNumeroModule />,
    notifications: <LazyNotifications />,
    'test-functionalities': <LazyTestFunctionalities />,
    'system-status': <LazySystemStatus />,
    radar: <LazyRadarModule />,
    autolead: <LazyAutoLeadModule />,
    digitacao: <LazyDigitacaoModule />,
    audios: <LazyAudiosModule />,
  }), [setActiveTab]);

  // ── Render active tab ──────────────────────────────────────────────
  const renderActiveComponent = () => {
    const permConfig = TAB_PERMISSIONS[activeTab];

    if (permConfig?.permission && !hasPermission(permConfig.permission)) {
      return <BlockedAccess message={permConfig.blockedMessage} />;
    }

    const component = tabComponents[activeTab as keyof typeof tabComponents];
    return component || tabComponents.dashboard;
  };

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return <LoadingAuth />;
  }

  // ── Unauthenticated ─────────────────────────────────────────────────
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

  // ── Authenticated layout ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="flex flex-col md:flex-row min-h-screen">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 w-full max-w-full overflow-x-auto pt-14 pb-20 md:pt-0 md:pb-0">
          <Suspense fallback={<LoadingFallback />}>
            {renderActiveComponent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Index;
