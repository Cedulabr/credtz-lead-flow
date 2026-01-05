import { useState, useEffect } from "react";
import { Home, Users, TrendingUp, DollarSign, LogOut, User, Settings, Phone, FileText, UserPlus, Wallet, Zap, Bell, Menu, X, Database, BarChart3, Users2, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import credtzLogo from "@/assets/credtz-logo-new.jpeg";
import { ConnectionStatus } from "./ConnectionStatus";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Navigation items with permission keys
const navItems = [
  { id: "dashboard", label: "Início", icon: Home, permissionKey: null },
  { id: "my-data", label: "Meus Dados", icon: UserCircle, permissionKey: null },
  { id: "indicate", label: "Indicar", icon: UserPlus, permissionKey: "can_access_indicar" },
  { id: "proposal-generator", label: "Gerador de Propostas", icon: FileText, permissionKey: "can_access_gerador_propostas" },
  { id: "activate-leads", label: "Activate Leads", icon: Zap, permissionKey: "can_access_activate_leads" },
  { id: "leads", label: "Leads Premium", icon: TrendingUp, permissionKey: "can_access_premium_leads" },
  { id: "baseoff-consulta", label: "Consulta Base OFF", icon: Database, permissionKey: null },
  { id: "my-clients", label: "Meus Clientes", icon: Users, permissionKey: "can_access_meus_clientes" },
  { id: "televendas", label: "Televendas", icon: Phone, permissionKey: "can_access_televendas" },
  { id: "televendas-manage", label: "Gestão Televendas", icon: Settings, permissionKey: "can_access_gestao_televendas" },
  { id: "finances", label: "Finanças", icon: Wallet, permissionKey: "can_access_financas" },
  { id: "documents", label: "Documentos", icon: FileText, permissionKey: "can_access_documentos" },
  { id: "reuse-alerts", label: "Alertas", icon: Bell, permissionKey: "can_access_alertas" },
  { id: "commission-table", label: "Tabela de Comissões", icon: DollarSign, permissionKey: "can_access_tabela_comissoes" },
  { id: "commissions", label: "Minhas Comissões", icon: DollarSign, permissionKey: "can_access_minhas_comissoes" },
  { id: "performance-report", label: "Relatório de Desempenho", icon: BarChart3, permissionKey: "admin_or_gestor" },
  { id: "collaborative", label: "Colaborativo", icon: Users2, permissionKey: null },
];

// Mobile priority items - only icons
const mobileNavItems = [
  { id: "indicate", label: "Indicar", icon: UserPlus, permissionKey: "can_access_indicar" },
  { id: "leads", label: "Leads Premium", icon: TrendingUp, permissionKey: "can_access_premium_leads" },
  { id: "finances", label: "Finanças", icon: Wallet, permissionKey: "can_access_financas" },
  { id: "commissions", label: "Minhas Comissões", icon: DollarSign, permissionKey: "can_access_minhas_comissoes" },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { companyName, logoUrl } = useWhitelabel();

  const [isGestor, setIsGestor] = useState(false);

  useEffect(() => {
    const checkGestorAccess = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("user_companies")
        .select("company_role")
        .eq("user_id", user.id)
        .eq("company_role", "gestor")
        .eq("is_active", true)
        .limit(1);
      
      setIsGestor(data && data.length > 0);
    };
    
    checkGestorAccess();
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  // Check if user has access to a specific section
  const hasAccess = (permissionKey: string | null): boolean => {
    if (!permissionKey) return true; // Dashboard always accessible
    if (isAdmin) return true; // Admin has full access
    
    // Special permission for admin or gestor
    if (permissionKey === "admin_or_gestor") {
      return isAdmin || isGestor;
    }
    
    // Check the specific permission in profile
    const profileData = profile as any;
    return profileData?.[permissionKey] !== false;
  };

  // Filter visible items based on permissions
  const visibleNavItems = navItems.filter(item => {
    // Always show dashboard
    if (!item.permissionKey) return true;
    // Admin sees everything
    if (isAdmin) return true;
    // Check permission
    return hasAccess(item.permissionKey);
  });

  // Filter mobile items based on permissions
  const visibleMobileItems = mobileNavItems.filter(item => {
    if (isAdmin) return true;
    return hasAccess(item.permissionKey);
  });

  return (
    <>
      {/* Mobile Header - Minimal with menu toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b z-50 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img 
            src={logoUrl || credtzLogo} 
            alt={`${companyName} Logo`} 
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="font-semibold text-foreground">{companyName}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-10 w-10"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Full Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-background z-40 pt-14 pb-20 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full justify-start gap-3 h-12"
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Button>
              );
            })}
            {isAdmin && (
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/admin'}
                className="w-full justify-start gap-3 h-12"
              >
                <Settings size={20} />
                <span>Admin</span>
              </Button>
            )}
          </nav>
          
          {user && (
            <div className="p-4 border-t mt-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{profile?.name || user.email}</p>
                  {profile?.role && (
                    <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                  )}
                </div>
              </div>
              <ConnectionStatus />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                className="w-full mt-3"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden md:flex md:flex-col md:w-64 md:bg-card md:border-r md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <img 
              src={logoUrl || credtzLogo} 
              alt={`${companyName} Logo`} 
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
              <p className="text-sm text-muted-foreground">Serviços</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                onClick={() => onTabChange(item.id)}
                className="w-full justify-start space-x-3"
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Button>
            );
          })}
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                onClick={() => window.location.href = '/admin'}
                className="w-full justify-start space-x-3"
              >
                <Settings size={20} />
                <span>Admin</span>
              </Button>
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          {user && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile?.name || user.email}
                  </p>
                  {profile?.role && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {profile.role}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="flex justify-center">
                <ConnectionStatus />
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation for Mobile - Icons only with tooltips */}
      <TooltipProvider delayDuration={0}>
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-inset-bottom">
          <div className="flex justify-around items-center px-2 py-2">
            {/* Home button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange("dashboard")}
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200",
                    activeTab === "dashboard"
                      ? "text-primary bg-primary/15 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Home size={26} strokeWidth={activeTab === "dashboard" ? 2.5 : 2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-medium">
                Início
              </TooltipContent>
            </Tooltip>

            {/* Dynamic mobile items - icons only */}
            {visibleMobileItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200",
                        activeTab === item.id
                          ? "text-primary bg-primary/15 shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* More menu button - toggles open/close */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200",
                    isMobileMenuOpen
                      ? "text-primary bg-primary/15 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {isMobileMenuOpen ? <X size={26} strokeWidth={2.5} /> : <Menu size={26} strokeWidth={2} />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-medium">
                {isMobileMenuOpen ? "Fechar" : "Menu"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    </>
  );
}