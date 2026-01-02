import { useState } from "react";
import { Home, Users, TrendingUp, DollarSign, LogOut, User, Settings, Phone, FileText, UserPlus, Wallet, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import credtzLogo from "@/assets/credtz-logo.png";
import { ConnectionStatus } from "./ConnectionStatus";
import { useWhitelabel } from "@/hooks/useWhitelabel";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Navigation items with permission keys
const navItems = [
  { id: "dashboard", label: "Início", icon: Home, permissionKey: null },
  { id: "indicate", label: "Indicar", icon: UserPlus, permissionKey: "can_access_indicar" },
  { id: "proposal-generator", label: "Gerador de Propostas", icon: FileText, permissionKey: "can_access_gerador_propostas" },
  { id: "activate-leads", label: "Activate Leads", icon: Zap, permissionKey: "can_access_activate_leads" },
  { id: "leads", label: "Leads Premium", icon: TrendingUp, permissionKey: "can_access_premium_leads" },
  { id: "my-clients", label: "Meus Clientes", icon: Users, permissionKey: "can_access_meus_clientes" },
  { id: "televendas", label: "Televendas", icon: Phone, permissionKey: "can_access_televendas" },
  { id: "televendas-manage", label: "Gestão Televendas", icon: Settings, permissionKey: "can_access_gestao_televendas" },
  { id: "finances", label: "Finanças", icon: Wallet, permissionKey: "can_access_financas" },
  { id: "documents", label: "Documentos", icon: FileText, permissionKey: "can_access_documentos" },
  { id: "commission-table", label: "Tabela de Comissões", icon: DollarSign, permissionKey: "can_access_tabela_comissoes" },
  { id: "commissions", label: "Minhas Comissões", icon: DollarSign, permissionKey: "can_access_minhas_comissoes" },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { companyName, logoUrl } = useWhitelabel();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  // Check if user has access to a specific section
  const hasAccess = (permissionKey: string | null): boolean => {
    if (!permissionKey) return true; // Dashboard always accessible
    if (isAdmin) return true; // Admin has full access
    
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

  return (
    <>
      {/* Mobile Header - Hidden to save space */}
      <div className="md:hidden h-0"></div>

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

      {/* Bottom Navigation for Mobile - Show first 4 visible items */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 shadow-elevation">
        <div className="grid grid-cols-4 gap-1 px-2 py-1">
          {visibleNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 rounded-lg min-h-[72px]",
                  activeTab === item.id
                    ? "text-primary bg-primary/10 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon size={24} className="mb-1" />
                <span className="text-xs text-center leading-tight font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
        {isAdmin && (
          <div className="border-t px-2 py-1">
            <button
              onClick={() => window.location.href = '/admin'}
              className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground text-sm"
            >
              <Settings size={16} className="mr-2" />
              Admin
            </button>
          </div>
        )}
      </div>
    </>
  );
}