import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WhitelabelConfig {
  id: string;
  logo_url: string | null;
  favicon_url: string | null;
  company_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export function useWhitelabel() {
  const [config, setConfig] = useState<WhitelabelConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('whitelabel_config' as any)
        .select('*')
        .maybeSingle();

      if (data) {
        const configData = data as any;
        setConfig(configData);
        
        // Update favicon if configured
        if (configData.favicon_url) {
          updateFavicon(configData.favicon_url);
        }
      }
    } catch (error) {
      console.error('Error fetching whitelabel config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFavicon = (faviconUrl: string) => {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = faviconUrl;
    } else {
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.href = faviconUrl;
      newFavicon.type = 'image/png';
      document.head.appendChild(newFavicon);
    }
  };

  return {
    config,
    loading,
    companyName: config?.company_name || 'Credtz',
    logoUrl: config?.logo_url,
    primaryColor: config?.primary_color,
    secondaryColor: config?.secondary_color,
    refresh: fetchConfig
  };
}