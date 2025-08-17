import { useState } from "react";
import { Home, Users, TrendingUp, DollarSign, Bell, Menu, X, LogOut, User, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import credtzLogo from "@/assets/credtz-logo.png";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Início", icon: Home },
  { id: "indicate", label: "Indicar", icon: Users },
  { id: "leads", label: "Leads Premium", icon: TrendingUp },
  { id: "baseoff", label: "BaseOFF", icon: Users },
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
      {/* Mobile Header */}
      <div className="md:hidden bg-card border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img 
              src={credtzLogo} 
              alt="Credtz Logo" 
              className="w-8 h-8 rounded-lg"
            />
            <h1 className="text-lg font-bold text-foreground">Credtz</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t bg-card">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors",
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {isAdmin && (
              <button
                onClick={() => {
                  window.location.href = '/admin';
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-muted-foreground hover:bg-muted"
              >
                <Settings size={20} />
                <span>Admin</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50">
        <div className="flex">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors",
                  activeTab === item.id
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}