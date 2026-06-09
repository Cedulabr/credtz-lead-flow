import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, User, Settings, Menu, X, ChevronRight, 
  PanelLeftClose, PanelLeftOpen, LogIn
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import easynLogo from "@/assets/easyn-logo.png";
import { ConnectionStatus } from "./ConnectionStatus";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useUserMenu } from "@/hooks/useUserMenu";
import { getIcon } from "@/config/modules";
import { ScrollArea } from "./ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const { user, profile, signOut, isAdmin } = useAuth();
  const { companyName, logoUrl } = useWhitelabel();
  const { sections, isLoading } = useUserMenu();

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
    toast.success("Saiu com sucesso");
  };

  // Find current item for mobile title
  const currentItemLabel = sections
    .flatMap(s => s.items)
    .find(i => i.moduleKey === activeTab)?.label || "Dashboard";

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
                  "w-full h-10 mb-1",
                  isActive && "shadow-md"
                )}
              >
                <Icon size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
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
            if (isMobile) setIsMobileMenuOpen(false);
          }}
          className={cn(
            "w-full justify-start space-x-3 transition-all mb-1 h-10 px-3",
            isActive ? "shadow-md" : "hover:bg-secondary/50"
          )}
        >
          <Icon size={18} className={cn(isActive ? "text-primary-foreground" : "text-muted-foreground")} />
          <span className="truncate text-sm font-medium">{item.label}</span>
        </Button>
      );
    });
  };

  return (
    <TooltipProvider delayDuration={0}>
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
            <span className="text-xs text-muted-foreground leading-tight">{currentItemLabel}</span>
          </div>
        </div>
        <motion.button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence mode="wait">
            {isMobileMenuOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X size={22} />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Menu size={22} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed top-14 right-0 bottom-0 w-[85%] max-w-sm bg-card z-40 shadow-xl overflow-hidden flex flex-col"
            >
              <ScrollArea className="flex-1 p-4">
                <Accordion type="multiple" defaultValue={["principal"]} className="w-full space-y-2">
                  {sections.map((section) => (
                    <AccordionItem key={section.categoryKey} value={section.categoryKey} className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                        <div className="flex items-center gap-2">
                          {section.label}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-1 pb-2">
                        <div className="space-y-1 pl-2 border-l ml-2 mt-1">
                          {renderNavItems(section.items, true)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                {isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => window.location.href = '/admin'}
                    className="w-full justify-start space-x-3 mt-4 h-12 rounded-xl border border-dashed"
                  >
                    <Settings size={20} className="text-primary" />
                    <span className="font-bold">Painel Administrativo</span>
                  </Button>
                )}
              </ScrollArea>
              
              {user && (
                <div className="p-4 border-t bg-secondary/10">
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
                  <Button variant="destructive" size="sm" onClick={handleSignOut} className="w-full mt-4 rounded-xl">
                    <LogOut className="h-4 w-4 mr-2" /> Sair
                  </Button>
                </div>
              )}
              <div className="h-safe-bottom" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex md:flex-col md:bg-card md:border-r md:h-screen md:sticky md:top-0 transition-all duration-300 ease-in-out z-40 shadow-sm",
        isCollapsed ? "md:w-20" : "md:w-72"
      )}>
        {/* Header */}
        <div className={cn("h-20 flex items-center border-b px-4 transition-all duration-300", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <motion.img 
                src={logoUrl || easynLogo} 
                alt="Logo" 
                className="w-10 h-10 rounded-xl object-contain shadow-sm border bg-white"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-foreground text-lg leading-tight truncate">{companyName}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Sistema de Gestão</span>
              </div>
            </div>
          )}
          {isCollapsed && (
             <img src={logoUrl || easynLogo} alt="Logo" className="w-10 h-10 rounded-xl object-contain shadow-sm border bg-white" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = !isCollapsed;
              setIsCollapsed(next);
              localStorage.setItem('sidebar-collapsed', String(next));
            }}
            className={cn("h-8 w-8 hover:bg-secondary shrink-0", !isCollapsed && "ml-2")}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>

        {/* Navigation Content */}
        <ScrollArea className="flex-1 px-3 py-4">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-secondary/50 rounded-lg w-full" />)}
            </div>
          ) : (
            <>
              {isCollapsed ? (
                <div className="flex flex-col items-center space-y-2">
                  {sections.map(section => (
                    <div key={section.categoryKey} className="w-full flex flex-col items-center space-y-2 pt-2 border-t first:border-t-0 mt-2 first:mt-0">
                      {renderNavItems(section.items)}
                    </div>
                  ))}
                </div>
              ) : (
                <Accordion type="multiple" defaultValue={["principal"]} className="w-full space-y-4">
                  {sections.map((section) => (
                    <AccordionItem key={section.categoryKey} value={section.categoryKey} className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-lg hover:bg-secondary/50 group">
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground group-hover:text-primary transition-colors">
                            {section.label}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-1 pb-2">
                        <div className="space-y-1 pl-3 border-l ml-4 mt-1 border-primary/20">
                          {renderNavItems(section.items)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </>
          )}

          {!isCollapsed && isAdmin && (
            <div className="mt-8 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin'}
                className="w-full justify-start space-x-3 h-12 rounded-xl bg-primary/5 hover:bg-primary/10 border-primary/20 group transition-all"
              >
                <Settings size={18} className="text-primary group-hover:rotate-45 transition-transform" />
                <span className="font-bold text-primary">Admin</span>
              </Button>
            </div>
          )}
          {isCollapsed && isAdmin && (
            <div className="mt-4 pt-4 border-t w-full flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => window.location.href = '/admin'} className="h-10 w-10 bg-primary/5 border-primary/20">
                    <Settings size={18} className="text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Admin</TooltipContent>
              </Tooltip>
            </div>
          )}
        </ScrollArea>

        {/* Footer / User Profile */}
        <div className={cn("p-4 border-t bg-secondary/5 transition-all duration-300", isCollapsed && "items-center")}>
          {user && (
            <div className="space-y-4">
              {!isCollapsed ? (
                <>
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-card border shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate text-foreground">{profile?.name || user.email}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{profile?.role || "Usuário"}</p>
                    </div>
                  </div>
                  <ConnectionStatus />
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-10 px-3">
                    <LogOut className="h-4 w-4 mr-3" />
                    <span className="font-medium">Sair da conta</span>
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div className="flex flex-col">
                        <span className="font-bold">{profile?.name || user.email}</span>
                        <span className="text-xs text-muted-foreground">{profile?.role}</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-10 w-10 hover:text-destructive hover:bg-destructive/10">
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
    </TooltipProvider>
  );
}