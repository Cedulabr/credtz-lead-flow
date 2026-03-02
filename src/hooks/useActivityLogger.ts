import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LogActivityParams {
  action: string;
  module: string;
  description: string;
  metadata?: Record<string, any>;
}

export function useActivityLogger() {
  const { user, profile } = useAuth();

  const logActivity = useCallback(async ({ action, module, description, metadata = {} }: LogActivityParams) => {
    if (!user) return;

    try {
      const enrichedMetadata = {
        ...metadata,
        user_agent: navigator.userAgent,
        timestamp_local: new Date().toISOString(),
      };

      await supabase.from('system_activity_logs').insert({
        user_id: user.id,
        user_name: profile?.name || user.email?.split('@')[0] || 'Unknown',
        user_email: user.email || profile?.email || '',
        action,
        module,
        description,
        metadata: enrichedMetadata,
      } as any);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, [user, profile]);

  return { logActivity };
}

// Standalone function for contexts where hooks can't be used
export async function logActivityDirect(params: {
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  module: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  try {
    await supabase.from('system_activity_logs').insert({
      user_id: params.userId,
      user_name: params.userName,
      user_email: params.userEmail,
      action: params.action,
      module: params.module,
      description: params.description,
      metadata: {
        ...params.metadata,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        timestamp_local: new Date().toISOString(),
      },
    } as any);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
