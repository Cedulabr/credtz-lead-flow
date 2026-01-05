import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, FileText, History, Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

import { UserData, UserDocument, UserDataStatus, DocumentStatus } from './types';
import { StatusCard } from './StatusCard';
import { PersonalDataForm } from './PersonalDataForm';
import { DocumentsManager } from './DocumentsManager';
import { HistoryLog } from './HistoryLog';
import { AdminObservations } from './AdminObservations';

interface UserDataDetailProps {
  userData: UserData;
  userId: string;
  onBack: () => void;
}

export function UserDataDetail({ userData: initialUserData, userId, onBack }: UserDataDetailProps) {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData>(initialUserData);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch latest user data
      const { data: userDataResult, error: userDataError } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userDataError) throw userDataError;
      setUserData(userDataResult as UserData);

      // Fetch documents
      const { data: docsResult, error: docsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments((docsResult || []) as UserDocument[]);

      // Fetch user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();

      setUserName(profile?.name || userDataResult.full_name || profile?.email || 'Usuário');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
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

    // Send notification to user
    const notificationTitle = status === 'approved' 
      ? 'Cadastro Aprovado!' 
      : status === 'rejected' 
        ? 'Cadastro Reprovado' 
        : 'Atualização de Cadastro';
    
    const notificationMessage = status === 'approved'
      ? 'Parabéns! Seu cadastro foi aprovado.'
      : status === 'rejected'
        ? `Seu cadastro foi reprovado. Motivo: ${rejectionReason || 'Não especificado'}`
        : 'O status do seu cadastro foi atualizado.';

    await supabase.from('user_data_notifications').insert({
      user_id: userId,
      type: status === 'approved' ? 'approval' : status === 'rejected' ? 'rejection' : 'status_update',
      title: notificationTitle,
      message: notificationMessage,
      related_user_data_id: userData.id,
    });

    toast.success(`Notificação enviada ao usuário: ${notificationTitle}`);
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

    // Get document info for notification
    const doc = documents.find(d => d.id === docId);
    
    // Send notification to user
    const notificationTitle = status === 'approved' 
      ? 'Documento Aprovado' 
      : 'Documento Reprovado';
    
    const notificationMessage = status === 'approved'
      ? `O documento "${doc?.document_name || 'enviado'}" foi aprovado.`
      : `O documento "${doc?.document_name || 'enviado'}" foi reprovado. ${notes ? `Observação: ${notes}` : ''}`;

    await supabase.from('user_data_notifications').insert({
      user_id: userId,
      type: status === 'approved' ? 'document_approval' : 'document_rejection',
      title: notificationTitle,
      message: notificationMessage,
      related_user_data_id: userData.id,
    });

    toast.success(`Notificação enviada ao usuário: ${notificationTitle}`);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{userName}</h1>
          <p className="text-muted-foreground">
            Visualizando cadastro do usuário
          </p>
        </div>
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
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Validação</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <PersonalDataForm
            data={userData}
            onSave={async () => {}}
            isAdmin={true}
            readOnly={true}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsManager
            documents={documents}
            personType={userData?.person_type || 'pf'}
            userId={userId}
            onRefresh={fetchData}
            isAdmin={true}
            onReviewDocument={handleReviewDocument}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryLog userDataId={userData?.id || null} />
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <AdminObservations
            data={userData}
            onUpdateStatus={handleUpdateStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
