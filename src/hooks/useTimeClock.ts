import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TimeClock, TimeClockType, TimeClockSettings, TimeClockConsent } from '@/components/TimeClock/types';

export function useTimeClock(userId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getPublicIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const getCityState = async (lat: number, lng: number): Promise<{ city: string; state: string } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return {
        city: data.address?.city || data.address?.town || data.address?.municipality || '',
        state: data.address?.state || '',
      };
    } catch {
      return null;
    }
  };

  const uploadPhoto = async (photoBlob: Blob): Promise<string | null> => {
    if (!userId) return null;
    try {
      const fileName = `${userId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('time-clock-photos')
        .upload(fileName, photoBlob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const { data } = supabase.storage.from('time-clock-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const checkConsent = async (): Promise<boolean> => {
    if (!userId) return false;
    const { data } = await supabase
      .from('time_clock_consent')
      .select('consent_given')
      .eq('user_id', userId)
      .single();
    return data?.consent_given ?? false;
  };

  const saveConsent = async (ipAddress: string | null): Promise<void> => {
    if (!userId) return;
    await supabase.from('time_clock_consent').upsert({
      user_id: userId,
      consent_given: true,
      consent_date: new Date().toISOString(),
      ip_address: ipAddress,
    });
  };

  const getSettings = async (): Promise<TimeClockSettings | null> => {
    const { data } = await supabase
      .from('time_clock_settings')
      .select('*')
      .limit(1)
      .single();
    return data as TimeClockSettings | null;
  };

  const getTodayRecords = async (): Promise<TimeClock[]> => {
    if (!userId) return [];
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('time_clock')
      .select('*')
      .eq('user_id', userId)
      .eq('clock_date', today)
      .order('clock_time', { ascending: true });
    return (data as TimeClock[]) || [];
  };

  const getNextClockType = (records: TimeClock[]): TimeClockType => {
    if (records.length === 0) return 'entrada';
    const lastRecord = records[records.length - 1];
    switch (lastRecord.clock_type) {
      case 'entrada': return 'pausa_inicio';
      case 'pausa_inicio': return 'pausa_fim';
      case 'pausa_fim': return 'saida';
      case 'saida': return 'entrada';
      default: return 'entrada';
    }
  };

  const registerClock = async (
    clockType: TimeClockType,
    photoBlob: Blob | null,
    companyId: string | null
  ): Promise<boolean> => {
    if (!userId) return false;
    setLoading(true);
    try {
      const [ip, location] = await Promise.all([getPublicIP(), getLocation()]);
      let city = null;
      let state = null;
      if (location) {
        const cityState = await getCityState(location.latitude, location.longitude);
        if (cityState) {
          city = cityState.city;
          state = cityState.state;
        }
      }
      let photoUrl = null;
      if (photoBlob) {
        photoUrl = await uploadPhoto(photoBlob);
      }

      const { error } = await supabase.from('time_clock').insert({
        user_id: userId,
        company_id: companyId,
        clock_type: clockType,
        ip_address: ip,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        city,
        state,
        photo_url: photoUrl,
        user_agent: navigator.userAgent,
        device_info: {
          platform: navigator.platform,
          language: navigator.language,
          screen: { width: window.screen.width, height: window.screen.height },
        },
      });

      if (error) throw error;

      toast({
        title: 'Ponto registrado!',
        description: `${clockType.charAt(0).toUpperCase() + clockType.slice(1)} registrada com sucesso.`,
      });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar ponto',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getUserHistory = async (startDate: string, endDate: string): Promise<TimeClock[]> => {
    if (!userId) return [];
    const { data } = await supabase
      .from('time_clock')
      .select('*')
      .eq('user_id', userId)
      .gte('clock_date', startDate)
      .lte('clock_date', endDate)
      .order('clock_date', { ascending: false })
      .order('clock_time', { ascending: true });
    return (data as TimeClock[]) || [];
  };

  const getAllUsersHistory = async (
    startDate: string,
    endDate: string,
    companyId?: string
  ): Promise<TimeClock[]> => {
    let query = supabase
      .from('time_clock')
      .select('*')
      .gte('clock_date', startDate)
      .lte('clock_date', endDate)
      .order('clock_date', { ascending: false })
      .order('clock_time', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data } = await query;
    return (data as TimeClock[]) || [];
  };

  const adjustClock = async (
    clockId: string,
    newTime: string,
    reason: string
  ): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { data: oldRecord } = await supabase
        .from('time_clock')
        .select('*')
        .eq('id', clockId)
        .single();

      if (!oldRecord) return false;

      const { error: updateError } = await supabase
        .from('time_clock')
        .update({
          clock_time: newTime,
          status: 'ajustado',
        })
        .eq('id', clockId);

      if (updateError) throw updateError;

      await supabase.from('time_clock_logs').insert({
        time_clock_id: clockId,
        action: 'adjustment',
        performed_by: userId,
        reason,
        old_values: { clock_time: oldRecord.clock_time },
        new_values: { clock_time: newTime },
      });

      toast({ title: 'Ponto ajustado com sucesso!' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao ajustar ponto',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    loading,
    getPublicIP,
    getLocation,
    checkConsent,
    saveConsent,
    getSettings,
    getTodayRecords,
    getNextClockType,
    registerClock,
    getUserHistory,
    getAllUsersHistory,
    adjustClock,
  };
}
