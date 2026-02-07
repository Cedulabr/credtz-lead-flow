import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Users, TrendingUp, DollarSign, LogOut, User, Settings, Phone, FileText, UserPlus, Wallet, Zap, Bell, Menu, X, Database, BarChart3, Users2, UserCircle, Clock, ChevronRight, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import easynLogo from "@/assets/easyn-logo.jpg";
import { ConnectionStatus } from "./ConnectionStatus";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Navigation items with permission keys - MANTENHA SINCRONIZADO COM PERMISSION_MODULES em UsersList.tsx
const navItems = [
  { id: "dashboard", label: "Início", icon: Home, permissionKey: null },
  { id: "my-data", label: "Meus Dados", icon: UserCircle, permissionKey: null },
  { id: "indicate", label: "Indicar", icon: UserPlus, permissionKey: "can_access_indicar" },
  { id: "proposal-generator", label: "Gerador de Propostas", icon: FileText, permissionKey: "can_access_gerador_propostas" },
  { id: "activate-leads", label: "Activate Leads", icon: Zap, permissionKey: "can_access_activate_leads" },
  { id: "leads", label: "Leads Premium", icon: TrendingUp, permissionKey: "can_access_premium_leads" },
  { id: "baseoff-consulta", label: "Consulta Base OFF", icon: Database, permissionKey: "can_access_baseoff_consulta" },
  { id: "my-clients", label: "Meus Clientes", icon: Users, permissionKey: "can_access_meus_clientes" },
  { id: "televendas", label: "Televendas", icon: Phone, permissionKey: "can_access_televendas" },
  { id: "televendas-manage", label: "Gestão Televendas", icon: Settings, permissionKey: "can_access_gestao_televendas" },
  { id: "finances", label: "Finanças", icon: Wallet, permissionKey: "can_access_financas" },
  { id: "documents", label: "Documentos", icon: FileText, permissionKey: "can_access_documentos" },
  { id: "reuse-alerts", label: "Oportunidades", icon: Target, permissionKey: "can_access_alertas" },
  { id: "commission-table", label: "Tabela de Comissões", icon: DollarSign, permissionKey: "can_access_tabela_comissoes" },
  { id: "commissions", label: "Minhas Comissões", icon: DollarSign, permissionKey: "can_access_minhas_comissoes" },
  { id: "performance-report", label: "Relatório de Desempenho", icon: BarChart3, permissionKey: "can_access_relatorio_desempenho" },
  { id: "collaborative", label: "Colaborativo", icon: Users2, permissionKey: "can_access_colaborativo" },
  { id: "time-clock", label: "Controle de Ponto", icon: Clock, permissionKey: "can_access_controle_ponto" },
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

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  // Check if user has access to a specific section
  const hasAccess = (permissionKey: string | null): boolean => {
    if (!permissionKey) return true;
    if (isAdmin) return true;
    
    if (permissionKey === "admin_or_gestor") {
      return isAdmin || isGestor;
    }
    
    const profileData = profile as any;
    return profileData?.[permissionKey] !== false;
  };

  // Filter visible items based on permissions
  const visibleNavItems = navItems.filter(item => {
    if (!item.permissionKey) return true;
    if (isAdmin) return true;
    return hasAccess(item.permissionKey);
  });

  // Filter mobile items based on permissions
  const visibleMobileItems = mobileNavItems.filter(item => {
    if (isAdmin) return true;
    return hasAccess(item.permissionKey);
  });

  // Get current page title
  const currentPageTitle = navItems.find(item => item.id === activeTab)?.label || "Dashboard";

  return (
    <>
      {/* Mobile Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="md:hidden fixed top-0 left-0 right-0 bg-card/95 backdrop-blur-md border-b z-50 h-14 flex items-center justify-between px-4 safe-area-inset-top"
      >
        <div className="flex items-center gap-3">
          <motion.img 
            src={logoUrl || easynLogo} 
            alt={`${companyName} Logo`} 
            className="w-8 h-8 rounded-lg object-contain"
            whileTap={{ scale: 0.95 }}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm leading-tight">{companyName}</span>
            <span className="text-xs text-muted-foreground leading-tight">{currentPageTitle}</span>
          </div>
        </div>
        <motion.button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait">
            {isMobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X size={22} />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu size={22} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Mobile Full Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed top-14 right-0 bottom-0 w-[85%] max-w-sm bg-card z-40 shadow-xl overflow-y-auto"
            >
              <nav className="p-4 space-y-1.5">
                {visibleNavItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <motion.button
                      key={item.id}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => {
                        onTabChange(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-secondary/70 active:bg-secondary"
                      )}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div layoutId="activeIndicator">
                          <ChevronRight size={18} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
                
                {isAdmin && (
                  <motion.button
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: visibleNavItems.length * 0.03 }}
                    onClick={() => window.location.href = '/admin'}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/70 active:bg-secondary transition-all"
                  >
                    <Settings size={20} />
                    <span className="flex-1 text-left font-medium">Admin</span>
                  </motion.button>
                )}
              </nav>
              
              {/* User Section */}
              {user && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 border-t mt-4 mx-4 rounded-xl bg-secondary/30"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{profile?.name || user.email}</p>
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
                    className="w-full mt-4"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </motion.div>
              )}
              
              {/* Bottom spacing for safe area */}
              <div className="h-24" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:bg-card md:border-r md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <img 
              src={logoUrl || easynLogo} 
              alt={`${companyName} Logo`} 
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
              <p className="text-sm text-muted-foreground">Serviços</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full justify-start space-x-3 transition-all",
                  isActive && "shadow-md"
                )}
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
              className="w-full justify-start space-x-3"
            >
              <Settings size={20} />
              <span>Admin</span>
            </Button>
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

      {/* Bottom Navigation for Mobile */}
      <TooltipProvider delayDuration={0}>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t z-50 safe-area-inset-bottom"
        >
          <div className="flex justify-around items-center px-1 py-1.5">
            {/* Home button */}
            <motion.button
              onClick={() => onTabChange("dashboard")}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] h-12 px-2 rounded-xl transition-all duration-200",
                activeTab === "dashboard"
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground active:bg-muted/50"
              )}
              whileTap={{ scale: 0.92 }}
            >
              <Home size={22} strokeWidth={activeTab === "dashboard" ? 2.5 : 2} />
              <span className={cn(
                "text-[10px] font-medium mt-0.5 leading-tight",
                activeTab === "dashboard" ? "text-primary" : "text-muted-foreground"
              )}>
                Início
              </span>
            </motion.button>

            {/* Dynamic mobile items */}
            {visibleMobileItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[56px] h-12 px-2 rounded-xl transition-all duration-200",
                    isActive
                      ? "text-primary bg-primary/15"
                      : "text-muted-foreground active:bg-muted/50"
                  )}
                  whileTap={{ scale: 0.92 }}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn(
                    "text-[10px] font-medium mt-0.5 leading-tight truncate max-w-[48px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label.split(' ')[0]}
                  </span>
                </motion.button>
              );
            })}

            {/* More menu button */}
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] h-12 px-2 rounded-xl transition-all duration-200",
                isMobileMenuOpen
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground active:bg-muted/50"
              )}
              whileTap={{ scale: 0.92 }}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                  >
                    <X size={22} strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                  >
                    <Menu size={22} strokeWidth={2} />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 leading-tight",
                isMobileMenuOpen ? "text-primary" : "text-muted-foreground"
              )}>
                Menu
              </span>
            </motion.button>
          </div>
        </motion.div>
      </TooltipProvider>
    </>
  );
}
