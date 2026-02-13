import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const PROFILE_CACHE_TTL = 60000; // 60 seconds cache

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const profileCache = useRef<{ data: Profile | null; timestamp: number; userId: string } | null>(null);
  const fetchInFlight = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    if (!userId) return;

    // Check cache
    const cached = profileCache.current;
    if (cached && cached.userId === userId && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
      if (profile !== cached.data) setProfile(cached.data);
      setProfileLoading(false);
      return;
    }

    // Deduplicate concurrent requests for the same user
    if (fetchInFlight.current === userId) return;
    fetchInFlight.current = userId;

    if (retryCount === 0) setProfileLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout (was 10s)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (error) {
        console.error('Error fetching profile:', error);

        // Retry on network errors (max 1 retry)
        if (
          (error.message?.includes('Failed to fetch') ||
            error.message?.includes('timeout') ||
            error.message?.includes('aborted')) &&
          retryCount < 1
        ) {
          fetchInFlight.current = null;
          const delay = 1500;
          console.log(`Network error, retrying in ${delay}ms...`);
          setTimeout(() => fetchProfile(userId, retryCount + 1), delay);
          return;
        }

        // Profile not found → create
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          await createProfile(userId);
        } else {
          setProfile(null);
        }
      } else if (data) {
        console.log('Profile loaded successfully:', data);
        profileCache.current = { data, timestamp: Date.now(), userId };
        setProfile(data);
      } else {
        await createProfile(userId);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      if (retryCount < 1) {
        fetchInFlight.current = null;
        setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
        return;
      }
      setProfile(null);
    } finally {
      setProfileLoading(false);
      fetchInFlight.current = null;
    }
  }, []);

  const createProfile = useCallback(async (userId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'partner',
          name: authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'User',
          email: authUser?.email,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error creating profile:', error);
        setProfile(null);
      } else {
        profileCache.current = { data: newProfile, timestamp: Date.now(), userId };
        setProfile(newProfile);
      }
    } catch (e) {
      console.error('Failed to create profile:', e);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      // Invalidate cache so it re-fetches
      profileCache.current = null;
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Force stop loading after 6 seconds (was 10s)
    const forceStopTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization took too long, forcing completion');
        setLoading(false);
        setProfileLoading(false);
      }
    }, 6000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        console.log('Auth state changed:', event, newSession?.user?.id);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Only fetch profile if not already initialized (avoid duplicates)
          if (initializedRef.current) {
            fetchProfile(newSession.user.id);
          }
        } else {
          setProfile(null);
          setProfileLoading(false);
          profileCache.current = null;
        }

        setLoading(false);
      }
    );

    // THEN get initial session
    const initAuth = async () => {
      try {
        console.log('Initializing authentication...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) console.error('Error getting session:', error);

        if (mounted) {
          console.log('Setting initial session:', currentSession?.user?.id ? 'User found' : 'No user');
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            // Fetch profile immediately (no artificial delay)
            fetchProfile(currentSession.user.id);
          }

          initializedRef.current = true;
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          setProfileLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      clearTimeout(forceStopTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: name ? { name } : undefined,
        },
      });
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      profileCache.current = null;
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isAdmin = profile?.role === 'admin';

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
