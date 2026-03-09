import { supabase } from '@/integrations/supabase/client';
import type { AuditFlag, AuditResult, AuditStatus, TimeClockSettings, FaceDetectionResult } from './types';

// Haversine formula to calculate distance between two coordinates in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function determineAuditStatus(score: number): AuditStatus {
  if (score >= 80) return 'normal';
  if (score >= 40) return 'suspicious';
  return 'irregular';
}

interface AuditInput {
  userId: string;
  latitude: number | null;
  longitude: number | null;
  ipAddress: string | null;
  faceResult: FaceDetectionResult | null;
}

export function useAuditEngine() {
  
  const getSettings = async (): Promise<TimeClockSettings | null> => {
    const { data } = await supabase
      .from('time_clock_settings')
      .select('*')
      .limit(1)
      .single();
    return data as TimeClockSettings | null;
  };

  const getRecentIPs = async (userId: string, limit = 10): Promise<string[]> => {
    const { data } = await supabase
      .from('time_clock')
      .select('ip_address')
      .eq('user_id', userId)
      .not('ip_address', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return (data || []).map(r => r.ip_address).filter(Boolean) as string[];
  };

  const calculateAudit = async (input: AuditInput): Promise<AuditResult> => {
    const flags: AuditFlag[] = [];
    let score = 100;

    // 1. Check geofence
    const settings = await getSettings();
    if (
      settings?.company_latitude &&
      settings?.company_longitude &&
      input.latitude &&
      input.longitude
    ) {
      const distance = haversineDistance(
        input.latitude,
        input.longitude,
        settings.company_latitude,
        settings.company_longitude
      );
      const radius = settings.geofence_radius_meters ?? 500;
      
      if (distance > radius) {
        flags.push({
          code: 'fora_da_area',
          label: `Fora da área permitida (${Math.round(distance)}m)`,
          scoreDelta: -50,
        });
        score -= 50;
      }
    }

    // 2. Check IP consistency
    if (input.ipAddress) {
      const recentIPs = await getRecentIPs(input.userId);
      if (recentIPs.length > 0 && !recentIPs.includes(input.ipAddress)) {
        flags.push({
          code: 'ip_suspeito',
          label: 'IP diferente do habitual',
          scoreDelta: -30,
        });
        score -= 30;
      }
    }

    // 3. Apply face detection results
    if (input.faceResult) {
      for (const flag of input.faceResult.flags) {
        flags.push(flag);
        score += flag.scoreDelta;
      }
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      status: determineAuditStatus(score),
      flags,
    };
  };

  const shouldBlockRegistration = async (auditResult: AuditResult): Promise<{ block: boolean; reason: string | null }> => {
    const settings = await getSettings();
    if (!settings) return { block: false, reason: null };

    // Check if should block on invalid photo
    if (settings.block_on_invalid_photo) {
      const photoFlag = auditResult.flags.find(f => f.code === 'foto_invalida');
      if (photoFlag) {
        return { block: true, reason: 'Foto inválida: nenhum rosto detectado' };
      }
    }

    // Check if should block on geofence violation
    if (settings.block_on_geofence_violation) {
      const geoFlag = auditResult.flags.find(f => f.code === 'fora_da_area');
      if (geoFlag) {
        return { block: true, reason: 'Você está fora da área permitida para registro de ponto' };
      }
    }

    return { block: false, reason: null };
  };

  return {
    calculateAudit,
    shouldBlockRegistration,
    getSettings,
  };
}
