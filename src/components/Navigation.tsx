import { useState } from "react";
import { Home, Users, TrendingUp, DollarSign, LogOut, User, Settings, Phone } from "lucide-react";
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

// Navigation items for mobile-first
const navItems = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "indicate", label: "Indicar", icon: Users },
  { id: "leads", label: "Leads Premium", icon: TrendingUp },
  { id: "televendas", label: "Televendas", icon: Phone },
  { id: "televendas-manage", label: "Gestão Televendas", icon: Settings },
  { id: "commission-table", label: "Tabela de Comissões", icon: DollarSign },
  { id: "commissions", label: "Minhas Comissões", icon: DollarSign },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { companyName, logoUrl } = useWhitelabel();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

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

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Check if user has permission for premium features
            const isPermissionRequired = ['leads'].includes(item.id);
            const hasPermission = isPermissionRequired ? 
              (item.id === 'leads' && profile?.leads_premium_enabled) ||
              isAdmin
              : true;
            
            if (isPermissionRequired && !hasPermission) return null;
            
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

      {/* Bottom Navigation for Mobile - Simplified 4 icons max */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 shadow-elevation">
        <div className="grid grid-cols-4 gap-1 px-2 py-1">
          {navItems.filter(item => {
            // Check if user has permission for premium features
            const isPermissionRequired = ['leads'].includes(item.id);
            const hasPermission = isPermissionRequired ? 
              (item.id === 'leads' && profile?.leads_premium_enabled) ||
              isAdmin
              : true;
            
            return !isPermissionRequired || hasPermission;
          }).slice(0, 4).map((item) => {
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