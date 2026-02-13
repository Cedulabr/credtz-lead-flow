// Supabase configuration management
// Reads from localStorage, falls back to hardcoded defaults

const STORAGE_KEY = 'supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  environment: 'production' | 'test';
  lastTested?: string;
  isCustom: boolean;
}

const DEFAULT_CONFIG: SupabaseConfig = {
  url: 'https://qwgsplcqyongfsqdjrme.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3Z3NwbGNxeW9uZ2ZzcWRqcm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjcxODMsImV4cCI6MjA1OTIwMzE4M30.mEsDs4OMA7ns6O1v-0-UHUMEYFInN7ykhe8Gs4JuR3Y',
  environment: 'production',
  isCustom: false,
};

export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SupabaseConfig;
      if (parsed.url && parsed.anonKey) {
        return { ...DEFAULT_CONFIG, ...parsed, isCustom: true };
      }
    }
  } catch (e) {
    console.warn('Failed to read Supabase config from localStorage:', e);
  }

  return DEFAULT_CONFIG;
}

export function saveSupabaseConfig(config: Partial<SupabaseConfig>): void {
  try {
    const current = getSupabaseConfig();
    const updated = { ...current, ...config, isCustom: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save Supabase config:', e);
  }
}

export function resetSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset Supabase config:', e);
  }
}

export function getDefaultConfig(): SupabaseConfig {
  return { ...DEFAULT_CONFIG };
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{
  success: boolean;
  latencyMs: number;
  error?: string;
  details?: {
    authWorking: boolean;
    databaseWorking: boolean;
    projectRef: string;
  };
}> {
  const start = performance.now();

  try {
    // Test basic connectivity with a health check
    const healthResponse = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });

    const latencyMs = Math.round(performance.now() - start);

    if (!healthResponse.ok && healthResponse.status !== 404) {
      return {
        success: false,
        latencyMs,
        error: `HTTP ${healthResponse.status}: ${healthResponse.statusText}`,
      };
    }

    // Extract project ref from URL
    const urlMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectRef = urlMatch?.[1] || 'unknown';

    // Test database access
    let databaseWorking = false;
    try {
      const dbResponse = await fetch(`${url}/rest/v1/profiles?select=count&limit=1`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact',
        },
        signal: AbortSignal.timeout(5000),
      });
      databaseWorking = dbResponse.ok || dbResponse.status === 406;
    } catch {
      databaseWorking = false;
    }

    // Test auth endpoint
    let authWorking = false;
    try {
      const authResponse = await fetch(`${url}/auth/v1/settings`, {
        headers: { 'apikey': anonKey },
        signal: AbortSignal.timeout(5000),
      });
      authWorking = authResponse.ok;
    } catch {
      authWorking = false;
    }

    return {
      success: true,
      latencyMs,
      details: {
        authWorking,
        databaseWorking,
        projectRef,
      },
    };
  } catch (error: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      error: error.name === 'TimeoutError'
        ? 'Conexão expirou (timeout de 8s)'
        : error.message || 'Erro desconhecido',
    };
  }
}
