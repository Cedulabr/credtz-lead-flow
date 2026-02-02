import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, History, Users, Settings as SettingsIcon, CalendarClock, FileText, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ClockButton } from './ClockButton';
import { MyHistory } from './MyHistory';
import { AdminControl } from './AdminControl';
import { Settings } from './Settings';
import { ScheduleManager } from './ScheduleManager';
import { JustificationManager } from './JustificationManager';
import { ManagerDashboard } from './ManagerDashboard';
import { BlockedAccess } from '@/components/BlockedAccess';
import { Loader2 } from 'lucide-react';

export function TimeClock() {
  const { user, profile, isAdmin } = useAuth();
  const [isGestor, setIsGestor] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_companies')
      .select('company_id, company_role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (data) {
      setCompanyId(data.company_id);
      setIsGestor(data.company_role === 'gestor');
    }
    setLoading(false);
  };

  if (!user) {
    return <BlockedAccess />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canManage = isAdmin || isGestor;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Controle de Ponto</h1>
        <p className="text-muted-foreground">
          Registre seu ponto, envie justificativas e acompanhe seu histórico
        </p>
      </div>

      <Tabs defaultValue="clock" className="space-y-6">
        <TabsList className={`grid w-full ${canManage ? 'grid-cols-3 lg:grid-cols-7' : 'grid-cols-3'}`}>
          <TabsTrigger value="clock" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Ponto</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="justifications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Justificativas</span>
          </TabsTrigger>
          {canManage && (
            <>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Painel</span>
              </TabsTrigger>
              <TabsTrigger value="schedules" className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                <span className="hidden sm:inline">Jornadas</span>
              </TabsTrigger>
              <TabsTrigger value="control" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Controle</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="clock" className="space-y-6">
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <ClockButton
                userId={user.id}
                companyId={companyId}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <MyHistory userId={user.id} userName={profile?.name || profile?.email || 'Usuário'} />
        </TabsContent>

        <TabsContent value="justifications">
          <JustificationManager isManager={false} />
        </TabsContent>

        {canManage && (
          <>
            <TabsContent value="dashboard">
              <ManagerDashboard />
            </TabsContent>
            <TabsContent value="schedules">
              <ScheduleManager />
            </TabsContent>
            <TabsContent value="control">
              <AdminControl />
            </TabsContent>
            <TabsContent value="settings">
              <Settings />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
