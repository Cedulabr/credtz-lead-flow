import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, FileText, History, Settings, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { UserData, UserDocument, UserDataStatus, DocumentStatus } from './types';
import { StatusCard } from './StatusCard';
import { PersonalDataForm } from './PersonalDataForm';
import { DocumentsManager } from './DocumentsManager';
import { HistoryLog } from './HistoryLog';
import { AdminObservations } from './AdminObservations';
import { UserDataList } from './UserDataList';
import { UserDataDetail } from './UserDataDetail';

export function MyData() {
  const { user, profile } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Admin/Partner view states
  const [viewMode, setViewMode] = useState<'my-data' | 'user-list' | 'user-detail'>('my-data');
  const [selectedUserData, setSelectedUserData] = useState<UserData | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isPartner = profile?.role === 'partner';
  const canManageUsers = isAdmin || isPartner;

  // Set initial view based on role
  useEffect(() => {
    if (canManageUsers) {
      setViewMode('user-list');
    }
  }, [canManageUsers]);

  // Fetch pending count for admin/partner
  useEffect(() => {
    if (canManageUsers) {
      fetchPendingCount();
    }
  }, [canManageUsers]);

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from('user_data')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_review');
    setPendingCount(count || 0);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user data
      const { data: userDataResult, error: userDataError } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userDataError && userDataError.code !== 'PGRST116') {
        throw userDataError;
      }

      if (userDataResult) {
        setUserData(userDataResult as UserData);
      }

      // Fetch documents
      const { data: docsResult, error: docsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments((docsResult || []) as UserDocument[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonalData = async (formData: Partial<UserData>) => {
    if (!user) return;

    const dataToSave = {
      ...formData,
      user_id: user.id,
    };

    if (userData) {
      // Update existing
      const { error } = await supabase
        .from('user_data')
        .update(dataToSave)
        .eq('id', userData.id);

      if (error) throw error;

      // Log history
      await supabase.from('user_data_history').insert({
        user_data_id: userData.id,
        changed_by: user.id,
        action: 'updated',
        changes: formData,
      });
    } else {
      // Insert new
      const { data: newData, error } = await supabase
        .from('user_data')
        .insert(dataToSave)
        .select()
        .single();

      if (error) throw error;

      // Log history
      if (newData) {
        await supabase.from('user_data_history').insert({
          user_data_id: newData.id,
          changed_by: user.id,
          action: 'created',
          changes: formData,
        });
      }
    }

    await fetchData();
  };

  const handleUpdateStatus = async (
    status: UserDataStatus, 
    observations: string, 
    rejectionReason?: string
  ) => {
    if (!userData || !user) return;

    const updateData: any = {
      status,
      internal_observations: observations,
    };

    if (status === 'approved') {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
      updateData.rejected_by = null;
      updateData.rejected_at = null;
      updateData.rejection_reason = null;
    } else if (status === 'rejected') {
      updateData.rejected_by = user.id;
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = rejectionReason;
      updateData.approved_by = null;
      updateData.approved_at = null;
    }

    const { error } = await supabase
      .from('user_data')
      .update(updateData)
      .eq('id', userData.id);

    if (error) throw error;

    // Log history
    await supabase.from('user_data_history').insert({
      user_data_id: userData.id,
      changed_by: user.id,
      action: status,
      changes: { status, observations, rejectionReason },
    });

    await fetchData();
  };

  const handleReviewDocument = async (docId: string, status: DocumentStatus, notes: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_documents')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
      })
      .eq('id', docId);

    if (error) throw error;
    await fetchData();
  };

  const handleSelectUser = (userData: UserData, userId: string) => {
    setSelectedUserData(userData);
    setSelectedUserId(userId);
    setViewMode('user-detail');
  };

  const handleBackToList = () => {
    setSelectedUserData(null);
    setSelectedUserId(null);
    setViewMode('user-list');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User detail view for admin/partner
  if (viewMode === 'user-detail' && selectedUserData && selectedUserId) {
    return (
      <UserDataDetail
        userData={selectedUserData}
        userId={selectedUserId}
        onBack={handleBackToList}
      />
    );
  }

  // Admin/Partner navigation tabs
  const renderNavigationTabs = () => {
    if (!canManageUsers) return null;

    return (
      <div className="flex gap-2 mb-6">
        <Button
          variant={viewMode === 'user-list' ? 'default' : 'outline'}
          onClick={() => setViewMode('user-list')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Gestão de Cadastros
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-orange-500 text-white">
              {pendingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={viewMode === 'my-data' ? 'default' : 'outline'}
          onClick={() => setViewMode('my-data')}
          className="flex items-center gap-2"
        >
          <User className="h-4 w-4" />
          Meus Dados
        </Button>
      </div>
    );
  };

  // User list view for admin/partner
  if (viewMode === 'user-list' && canManageUsers) {
    return (
      <div className="space-y-6">
        {renderNavigationTabs()}
        <div>
          <h1 className="text-2xl font-bold">Gestão de Cadastros</h1>
          <p className="text-muted-foreground">
            Gerencie os cadastros de todos os usuários
          </p>
        </div>
        <UserDataList onSelectUser={handleSelectUser} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderNavigationTabs()}
      <div>
        <h1 className="text-2xl font-bold">Meus Dados</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e documentos
        </p>
      </div>

      <StatusCard
        status={userData?.status || 'incomplete'}
        documents={documents}
        personType={userData?.person_type || 'pf'}
        rejectionReason={userData?.rejection_reason}
      />

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none lg:inline-flex">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Dados Pessoais</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <PersonalDataForm
            data={userData}
            onSave={handleSavePersonalData}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsManager
            documents={documents}
            personType={userData?.person_type || 'pf'}
            userId={user?.id || ''}
            onRefresh={fetchData}
            isAdmin={isAdmin}
            onReviewDocument={isAdmin ? handleReviewDocument : undefined}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryLog userDataId={userData?.id || null} />
        </TabsContent>

        {isAdmin && userData && (
          <TabsContent value="admin" className="mt-6">
            <AdminObservations
              data={userData}
              onUpdateStatus={handleUpdateStatus}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
