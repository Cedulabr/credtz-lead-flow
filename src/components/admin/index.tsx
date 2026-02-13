import { useState, useEffect } from 'react';
import { AdminLayout, type AdminModule } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { AdminOperations } from './AdminOperations';
import { AdminPeople } from './AdminPeople';
import { AdminFinance } from './AdminFinance';
import { AdminSystem } from './AdminSystem';
import { AdminDatabase } from './AdminDatabase';
import { supabase } from '@/integrations/supabase/client';

export function AdminPanelNew() {
  const [activeModule, setActiveModule] = useState<AdminModule>('dashboard');
  const [pendingAlerts, setPendingAlerts] = useState(0);

  useEffect(() => {
    fetchPendingAlerts();
  }, []);

  const fetchPendingAlerts = async () => {
    try {
      // Count pending duplicates + inactive users
      const [duplicatesResult, inactiveResult] = await Promise.all([
        supabase
          .from('activate_leads_duplicates')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', false)
      ]);

      const duplicates = duplicatesResult.count || 0;
      const inactive = inactiveResult.count || 0;
      setPendingAlerts(duplicates + inactive);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <AdminDashboard onNavigate={setActiveModule} />;
      case 'operations':
        return <AdminOperations />;
      case 'people':
        return <AdminPeople />;
      case 'finance':
        return <AdminFinance />;
      case 'system':
        return <AdminSystem />;
      case 'database':
        return <AdminDatabase />;
      default:
        return <AdminDashboard onNavigate={setActiveModule} />;
    }
  };

  return (
    <AdminLayout
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      pendingAlerts={pendingAlerts}
    >
      {renderModuleContent()}
    </AdminLayout>
  );
}

export { AdminLayout } from './AdminLayout';
export { AdminDashboard } from './AdminDashboard';
export { AdminOperations } from './AdminOperations';
export { AdminPeople } from './AdminPeople';
export { AdminFinance } from './AdminFinance';
export { AdminSystem } from './AdminSystem';
export { AdminDatabase } from './AdminDatabase';
