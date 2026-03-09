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

interface RecentRecord {
  ip_address: string | null;
  latitude: number | null;
  longitude: number | null;
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

  // Fetch last N records with IP and location
  const getRecentRecords = async (userId: string, limit = 20): Promise<RecentRecord[]> => {
    const { data } = await supabase
      .from('time_clock')
      .select('ip_address, latitude, longitude')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return (data || []) as RecentRecord[];
  };

  // Analyze IP frequency - returns flag if IP is new or rare
  const analyzeIPFrequency = (currentIP: string, records: RecentRecord[]): AuditFlag | null => {
    if (!currentIP || records.length < 3) return null; // Need at least 3 records for meaningful analysis

    const ipCount = records.filter(r => r.ip_address === currentIP).length;
    
    if (ipCount === 0) {
      // IP never seen in last 20 records
      return {
        code: 'ip_novo',
        label: 'IP nunca utilizado anteriormente',
        scoreDelta: -15,
      };
    } else if (ipCount < 2) {
      // IP seen only once in last 20 records (rare)
      return {
        code: 'ip_suspeito',
        label: 'IP raramente utilizado',
        scoreDelta: -30,
      };
    }
    
    return null;
  };

  // Analyze location variation - compare with user's typical locations
  const analyzeLocationVariation = (
    currentLat: number | null,
    currentLon: number | null,
    records: RecentRecord[]
  ): AuditFlag | null => {
    if (currentLat === null || currentLon === null) return null;
    
    // Get records with valid GPS
    const recordsWithGPS = records.filter(
      r => r.latitude !== null && r.longitude !== null
    );
    
    if (recordsWithGPS.length < 3) return null; // Need at least 3 records
    
    // Calculate distances to previous locations
    const distances = recordsWithGPS.slice(0, 5).map(r => 
      haversineDistance(currentLat, currentLon, r.latitude!, r.longitude!)
    );
    
    // Calculate average distance
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    
    // If average distance to recent locations > 5km, flag as suspicious
    if (avgDistance > 5000) {
      return {
        code: 'localizacao_diferente',
        label: `Localização ${Math.round(avgDistance / 1000)}km distante do habitual`,
        scoreDelta: -30,
      };
    }
    
    return null;
  };

  const calculateAudit = async (input: AuditInput): Promise<AuditResult> => {
    const flags: AuditFlag[] = [];
    let score = 100;

    // Fetch recent records for analysis
    const recentRecords = await getRecentRecords(input.userId);

    // 1. Check geofence (if configured)
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

    // 2. IP frequency analysis (improved)
    if (input.ipAddress) {
      const ipFlag = analyzeIPFrequency(input.ipAddress, recentRecords);
      if (ipFlag) {
        flags.push(ipFlag);
        score += ipFlag.scoreDelta;
      }
    }

    // 3. Location variation analysis (new)
    const locationFlag = analyzeLocationVariation(
      input.latitude,
      input.longitude,
      recentRecords
    );
    if (locationFlag) {
      flags.push(locationFlag);
      score += locationFlag.scoreDelta;
    }

    // 4. Apply face detection results
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

  // Re-audit a single record (for historical re-processing)
  const reauditRecord = async (recordId: string, userId: string): Promise<AuditResult> => {
    // Get the record
    const { data: record } = await supabase
      .from('time_clock')
      .select('*')
      .eq('id', recordId)
      .single();

    if (!record) {
      return { score: 100, status: 'normal', flags: [] };
    }

    // Get records BEFORE this one for comparison
    const { data: olderRecords } = await supabase
      .from('time_clock')
      .select('ip_address, latitude, longitude')
      .eq('user_id', userId)
      .lt('created_at', record.created_at)
      .order('created_at', { ascending: false })
      .limit(20);

    const recentRecords = (olderRecords || []) as RecentRecord[];
    const flags: AuditFlag[] = [];
    let score = 100;

    // Check geofence
    const settings = await getSettings();
    if (
      settings?.company_latitude &&
      settings?.company_longitude &&
      record.latitude &&
      record.longitude
    ) {
      const distance = haversineDistance(
        record.latitude,
        record.longitude,
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

    // IP frequency analysis
    if (record.ip_address && recentRecords.length >= 3) {
      const ipFlag = analyzeIPFrequency(record.ip_address, recentRecords);
      if (ipFlag) {
        flags.push(ipFlag);
        score += ipFlag.scoreDelta;
      }
    }

    // Location variation analysis
    if (record.latitude && record.longitude && recentRecords.length >= 3) {
      const locationFlag = analyzeLocationVariation(
        record.latitude,
        record.longitude,
        recentRecords
      );
      if (locationFlag) {
        flags.push(locationFlag);
        score += locationFlag.scoreDelta;
      }
    }

    // Note: We can't re-run face detection on historical photos

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      status: determineAuditStatus(score),
      flags,
    };
  };

  // Bulk re-audit for historical records
  const bulkReaudit = async (
    dateFrom: string,
    dateTo: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ processed: number; flagged: number }> => {
    // Get all records in the date range
    const { data: records } = await supabase
      .from('time_clock')
      .select('id, user_id')
      .gte('clock_date', dateFrom)
      .lte('clock_date', dateTo)
      .order('clock_date', { ascending: true })
      .order('clock_time', { ascending: true });

    if (!records || records.length === 0) {
      return { processed: 0, flagged: 0 };
    }

    let processed = 0;
    let flagged = 0;

    for (const record of records) {
      const auditResult = await reauditRecord(record.id, record.user_id);
      
      // Update the record
      await supabase
        .from('time_clock')
        .update({
          trust_score: auditResult.score,
          audit_flags: auditResult.flags as any,
          audit_status: auditResult.status,
        })
        .eq('id', record.id);

      processed++;
      if (auditResult.flags.length > 0) {
        flagged++;
      }

      if (onProgress) {
        onProgress(processed, records.length);
      }

      // Small delay to prevent overwhelming the database
      if (processed % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { processed, flagged };
  };

  return {
    calculateAudit,
    shouldBlockRegistration,
    getSettings,
    reauditRecord,
    bulkReaudit,
  };
}
