import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, User, Share2, Settings, ChevronDown, Menu, X, LogOut,
  Store, Receipt, Clock, PanelLeftClose, PanelLeftOpen,
  ChevronRight,
  Shield,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { useUserMenu } from "@/hooks/useUserMenu";
import { getIcon } from "@/config/modules";
import easynLogo from "@/assets/easyn-logo.png";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { companyName, logoUrl } = useWhitelabel();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed-v3');
    return saved === 'true';
  });
  
  const { sections, isLoading } = useUserMenu();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  const userInitials = useMemo(() => {
    const name = profile?.name || user?.email || "";
    return name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "").join("") || "?";
  }, [profile, user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sessão encerrada");
  };

  const renderNavItems = (items: any[], isMobile = false) => {
    return items.map((item) => {
      const Icon = getIcon(item.icon);
      const isActive = activeTab === item.moduleKey;
      
      if (isCollapsed && !isMobile) {
        return (
          <Tooltip key={item.moduleKey}>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? "default" : "ghost"}
                size="icon"
                onClick={() => onTabChange(item.moduleKey)}
                className={cn(
                  "w-full h-10 mb-1 transition-all duration-200",
                  isActive ? "shadow-md bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                <Icon size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      }
      
      return (
        <Button
          key={item.moduleKey}
          variant={isActive ? "default" : "ghost"}
          onClick={() => {
            onTabChange(item.moduleKey);
            if (isMobile) setMobileOpen(false);
          }}
          className={cn(
            "w-full justify-start space-x-3 transition-all mb-1 h-10 px-3 rounded-lg group",
            isActive 
              ? "shadow-sm bg-primary text-primary-foreground font-semibold" 
              : "text-foreground/70 hover:bg-primary/5 hover:text-primary"
          )}
        >
          <Icon size={18} className={cn(
            "transition-colors",
            isActive ? "text-primary-foreground" : "text-primary/60 group-hover:text-primary"
          )} />
          <span className="truncate text-[13px]">{item.label}</span>
          {isActive && (
            <motion.div layoutId="activeDot" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" />
          )}
        </Button>
      );
    });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card">
      {/* Brand Header */}
      <div className={cn(
        "h-16 flex items-center border-b px-4 transition-all duration-300",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div 
              key="expanded-logo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center p-1 border border-primary/20 shrink-0">
                <img src={logoUrl || easynLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-foreground text-sm leading-tight truncate">{companyName || "Easyn"}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Workspace</span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center p-1 border border-primary/20"
            >
              <img src={logoUrl || easynLogo} alt="Logo" className="w-full h-full object-contain" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const next = !isCollapsed;
            setIsCollapsed(next);
            localStorage.setItem('sidebar-collapsed-v3', String(next));
          }}
          className="h-8 w-8 hover:bg-secondary hidden md:flex shrink-0 ml-1"
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </Button>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 px-3 py-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-10 bg-muted/50 rounded-lg w-full" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {isCollapsed ? (
              <div className="flex flex-col items-center space-y-4">
                {sections.map(section => (
                  <div key={section.categoryKey} className="w-full flex flex-col items-center space-y-2 pt-4 border-t first:border-t-0 first:pt-0 border-border/40">
                    {renderNavItems(section.items)}
                  </div>
                ))}
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={["principal"]} className="w-full space-y-2">
                {sections.map((section) => (
                  <AccordionItem key={section.categoryKey} value={section.categoryKey} className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-muted/50 group text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 group-hover:text-primary transition-colors">
                          {section.label}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-2">
                      <div className="space-y-0.5">
                        {renderNavItems(section.items)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        )}
      </ScrollArea>

      {/* User & Utils Footer */}
      <div className={cn(
        "mt-auto border-t bg-muted/20 transition-all duration-300",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {isAdmin && (
          <div className="mb-4">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => window.location.href = '/admin'} className="h-10 w-10 mx-auto bg-card border-primary/20 hover:bg-primary/10">
                    <Settings size={18} className="text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Administração</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin'}
                className="w-full justify-start space-x-3 h-10 rounded-lg bg-card border-primary/20 hover:bg-primary/10 group"
              >
                <Shield size={16} className="text-primary group-hover:rotate-12 transition-transform" />
                <span className="font-bold text-xs text-primary">Painel Admin</span>
              </Button>
            )}
          </div>
        )}

        {user && (
          <div className="space-y-4">
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-3 p-2 rounded-xl bg-card border shadow-sm group">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <span className="text-xs font-bold">{userInitials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate text-foreground leading-tight">{profile?.name || user.email}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                      {isAdmin ? "Administrador" : (profile?.role || "Usuário")}
                    </p>
                  </div>
                </div>
                <div className="px-1">
                  <ConnectionStatus />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut} 
                  className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-9 px-2 rounded-lg"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  <span className="font-medium text-xs">Sair da conta</span>
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
                      <span className="text-xs font-bold text-primary">{userInitials}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-col">
                      <span className="font-bold">{profile?.name || user.email}</span>
                      <span className="text-xs text-muted-foreground capitalize">{profile?.role}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-10 w-10 hover:text-destructive hover:bg-destructive/10 text-muted-foreground">
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sair</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 999px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.5); }
      `}</style>

      {/* Mobile Trigger & Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-[60] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1 border border-primary/20">
            <img src={logoUrl || easynLogo} alt="logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
             <span className="font-bold text-sm leading-tight">{companyName || "Easyn"}</span>
             <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Portal</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((v) => !v)}
          className="h-10 w-10"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
              onClick={() => setMobileOpen(false)} 
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-[280px] bg-card border-r flex flex-col shadow-2xl"
              aria-label="Menu de navegação lateral"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen transition-all duration-300 border-r z-50",
          isCollapsed ? "w-20" : "w-[280px]"
        )}
      >
        {sidebarContent}
      </aside>
    </TooltipProvider>
  );
}

export default SidebarNav;