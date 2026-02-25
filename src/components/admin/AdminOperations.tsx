import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  Settings2, 
  Landmark, 
  Bell, 
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Copy,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Import existing components
import { AdminCreditsManagement } from '@/components/AdminCreditsManagement';
import { AdminCommissionRules } from '@/components/AdminCommissionRules';
import { AdminTelevendasBanks } from '@/components/AdminTelevendasBanks';
import { AdminBankReuseSettings } from '@/components/AdminBankReuseSettings';
import { AdminDuplicatesManager } from '@/components/AdminDuplicatesManager';
import { AdminInactivitySettings } from '@/components/AdminInactivitySettings';
import { AdminSmsCreditsManagement } from '@/components/AdminSmsCreditsManagement';

type OperationSection = 
  | 'menu' 
  | 'credits' 
  | 'sms-credits'
  | 'commission-rules' 
  | 'televendas-banks' 
  | 'bank-reuse' 
  | 'duplicates'
  | 'inactivity';

interface SectionItem {
  id: OperationSection;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'secondary';
}

export function AdminOperations() {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<OperationSection>('menu');

  const sections: SectionItem[] = [
    {
      id: 'credits',
      label: 'Gerenciar Créditos',
      description: 'Adicionar, remover e visualizar créditos de usuários',
      icon: Coins,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      id: 'sms-credits' as OperationSection,
      label: 'Créditos SMS',
      description: 'Gerenciar créditos SMS dos colaboradores',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      id: 'commission-rules',
      label: 'Regras de Comissão',
      description: 'Configurar regras flexíveis de comissão',
      icon: Settings2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      id: 'televendas-banks',
      label: 'Bancos Televendas',
      description: 'Gerenciar bancos disponíveis para televendas',
      icon: Landmark,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      id: 'bank-reuse',
      label: 'Alertas por Banco',
      description: 'Configurar tempo de reutilização por banco',
      icon: Bell,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      id: 'duplicates',
      label: 'Duplicatas',
      description: 'Revisar e gerenciar leads duplicados',
      icon: Copy,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      badge: 'Atenção',
      badgeVariant: 'destructive',
    },
    {
      id: 'inactivity',
      label: 'Inatividade',
      description: 'Configurar alertas de inatividade de usuários',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'credits':
        return <AdminCreditsManagement />;
      case 'sms-credits':
        return <AdminSmsCreditsManagement />;
      case 'commission-rules':
        return <AdminCommissionRules />;
      case 'televendas-banks':
        return <AdminTelevendasBanks />;
      case 'bank-reuse':
        return <AdminBankReuseSettings />;
      case 'duplicates':
        return <AdminDuplicatesManager />;
      case 'inactivity':
        return <AdminInactivitySettings />;
      default:
        return null;
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);

  // Show submenu on mobile and desktop
  if (activeSection === 'menu') {
    return (
      <div className="space-y-6 px-4 md:px-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Operação</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie créditos, regras e configurações operacionais
          </p>
        </div>

        <div className="grid gap-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                onClick={() => setActiveSection(section.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                      section.bgColor
                    )}>
                      <section.icon className={cn("h-6 w-6", section.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{section.label}</h3>
                        {section.badge && (
                          <Badge variant={section.badgeVariant || 'secondary'} className="shrink-0">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {section.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Show section content
  return (
    <div className="space-y-4 px-4 md:px-0">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setActiveSection('menu')}
        className="gap-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Operação
      </Button>

      {/* Section header */}
      {currentSection && (
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            currentSection.bgColor
          )}>
            <currentSection.icon className={cn("h-5 w-5", currentSection.color)} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold">{currentSection.label}</h1>
            <p className="text-sm text-muted-foreground">{currentSection.description}</p>
          </div>
        </div>
      )}

      {/* Section content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
