import { useState } from "react";
import { Home, Users, TrendingUp, DollarSign, Bell, Menu, X, LogOut, User, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import credtzLogo from "@/assets/credtz-logo.png";
import { ConnectionStatus } from "./ConnectionStatus";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "indicate", label: "Indicar", icon: Users },
  { id: "leads", label: "Leads Premium", icon: TrendingUp },
  { id: "commissions", label: "Comissões", icon: DollarSign },
  { id: "notifications", label: "Avisos", icon: Bell },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  return (
    <>
      {/* Mobile Header - Simple and Clean */}
      <div className="md:hidden bg-card border-b sticky top-0 z-50">
        <div className="flex items-center justify-center py-3">
          <h1 className="text-lg font-bold text-foreground">Credtz</h1>
        </div>
      </div>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden md:flex md:flex-col md:w-64 md:bg-card md:border-r md:h-screen md:sticky md:top-0">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <img 
              src={credtzLogo} 
              alt="Credtz Logo" 
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">Credtz</h1>
              <p className="text-sm text-muted-foreground">Serviços</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
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

      {/* Bottom Navigation for Mobile - Complete Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-pb">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 transition-colors min-h-[64px]",
                  activeTab === item.id
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px] mt-1 text-center leading-tight font-medium">{item.label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <button
              onClick={() => window.location.href = '/admin'}
              className="flex flex-col items-center justify-center py-2 px-1 transition-colors min-h-[64px] text-muted-foreground hover:text-foreground"
            >
              <Settings size={20} />
              <span className="text-[10px] mt-1 text-center leading-tight font-medium">Admin</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}