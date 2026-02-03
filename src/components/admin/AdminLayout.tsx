import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Wallet, 
  Building2,
  Bell,
  ChevronRight,
  X,
  Menu,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export type AdminModule = 
  | 'dashboard' 
  | 'operations' 
  | 'people' 
  | 'finance' 
  | 'system';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  pendingAlerts?: number;
}

const modules = [
  { 
    id: 'dashboard' as AdminModule, 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    description: 'Visão geral e alertas',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    id: 'operations' as AdminModule, 
    label: 'Operação', 
    icon: Settings,
    description: 'Créditos, Regras, Bancos',
    color: 'from-emerald-500 to-emerald-600'
  },
  { 
    id: 'people' as AdminModule, 
    label: 'Pessoas', 
    icon: Users,
    description: 'Usuários e Empresas',
    color: 'from-violet-500 to-violet-600'
  },
  { 
    id: 'finance' as AdminModule, 
    label: 'Financeiro', 
    icon: Wallet,
    description: 'Conta corrente e Comissões',
    color: 'from-amber-500 to-amber-600'
  },
  { 
    id: 'system' as AdminModule, 
    label: 'Sistema', 
    icon: Building2,
    description: 'Avisos e Whitelabel',
    color: 'from-slate-500 to-slate-600'
  },
];

export function AdminLayout({ 
  children, 
  activeModule, 
  onModuleChange,
  pendingAlerts = 0 
}: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const currentModule = modules.find(m => m.id === activeModule);

  const handleModuleClick = (moduleId: AdminModule) => {
    onModuleChange(moduleId);
    setIsOpen(false);
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b safe-area-inset-top"
        >
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                  currentModule?.color
                )}>
                  {currentModule && <currentModule.icon className="h-4 w-4 text-white" />}
                </div>
                <div>
                  <h1 className="font-semibold text-sm leading-tight">{currentModule?.label}</h1>
                  <p className="text-[10px] text-muted-foreground leading-tight">Painel Admin</p>
                </div>
              </div>
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-sm" className="relative">
                  <Menu className="h-5 w-5" />
                  {pendingAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
                      {pendingAlerts}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] max-w-sm p-0">
                <SheetHeader className="p-4 border-b bg-muted/30">
                  <SheetTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Módulos Admin
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-3 space-y-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    const isActive = activeModule === module.id;
                    const showBadge = module.id === 'dashboard' && pendingAlerts > 0;
                    
                    return (
                      <motion.button
                        key={module.id}
                        onClick={() => handleModuleClick(module.id)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "hover:bg-muted active:bg-muted/80"
                        )}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                          isActive 
                            ? "bg-white/20" 
                            : `bg-gradient-to-br ${module.color}`
                        )}>
                          <Icon className={cn(
                            "h-6 w-6",
                            isActive ? "text-primary-foreground" : "text-white"
                          )} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{module.label}</span>
                            {showBadge && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                {pendingAlerts}
                              </Badge>
                            )}
                          </div>
                          <p className={cn(
                            "text-xs mt-0.5",
                            isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}>
                            {module.description}
                          </p>
                        </div>
                        <ChevronRight className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      </motion.button>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </motion.header>

        {/* Mobile Bottom Navigation */}
        <motion.nav 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t safe-area-inset-bottom"
        >
          <div className="flex justify-around items-center px-1 py-1.5">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;
              const showBadge = module.id === 'dashboard' && pendingAlerts > 0;
              
              return (
                <motion.button
                  key={module.id}
                  onClick={() => onModuleChange(module.id)}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[56px] h-12 px-2 rounded-xl transition-all relative",
                    isActive
                      ? "text-primary bg-primary/15"
                      : "text-muted-foreground active:bg-muted/50"
                  )}
                  whileTap={{ scale: 0.92 }}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive && "stroke-[2.5]"
                  )} />
                  <span className={cn(
                    "text-[9px] font-medium mt-0.5 leading-tight",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {module.label.slice(0, 6)}
                  </span>
                  {showBadge && (
                    <span className="absolute top-0 right-1 h-4 w-4 rounded-full bg-destructive text-[9px] text-destructive-foreground flex items-center justify-center font-bold">
                      {pendingAlerts > 9 ? '9+' : pendingAlerts}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.nav>

        {/* Mobile Content */}
        <main className="pb-20 pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col sticky top-0 h-screen">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">Gestão do Sistema</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            const showBadge = module.id === 'dashboard' && pendingAlerts > 0;
            
            return (
              <motion.button
                key={module.id}
                onClick={() => onModuleChange(module.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted"
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                  isActive 
                    ? "bg-white/20" 
                    : `bg-gradient-to-br ${module.color}`
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary-foreground" : "text-white"
                  )} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{module.label}</span>
                    {showBadge && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {pendingAlerts}
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs truncate",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {module.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Área restrita</span>
          </div>
        </div>
      </aside>

      {/* Desktop Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
