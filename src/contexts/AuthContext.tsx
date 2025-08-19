import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) return;
    
    setProfileLoading(true);
    try {
      console.log('Fetching profile for user:', userId);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Error fetching profile:', error);
        
        // Only try to create profile if it doesn't exist (not for other errors)
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          console.log('Profile not found, attempting to create one...');
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                role: 'partner',
                name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
                email: user?.email
              })
              .select()
              .maybeSingle();
            
            if (createError) {
              console.error('Error creating profile:', createError);
              // Set a minimal profile to prevent infinite loading
              setProfile({
                id: userId,
                role: 'partner' as any,
                name: user?.email?.split('@')[0] || 'User',
                email: user?.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                organization_id: null,
                level: null,
                is_active: true,
                sector: null,
                company: null,
                pix_key: null,
                cpf: null,
                phone: null
              });
            } else {
              setProfile(newProfile);
            }
          } catch (createError) {
            console.error('Failed to create profile:', createError);
            // Set minimal profile as fallback
            setProfile({
              id: userId,
              role: 'partner' as any,
              name: user?.email?.split('@')[0] || 'User',
              email: user?.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              organization_id: null,
              level: null,
              is_active: true,
              sector: null,
              company: null,
              pix_key: null,
              cpf: null,
              phone: null
            });
          }
        } else {
          // For other errors, set a minimal profile to prevent blocking
          console.log('Setting fallback profile due to error:', error.message);
          setProfile({
            id: userId,
            role: 'partner' as any,
            name: user?.email?.split('@')[0] || 'User',
            email: user?.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            organization_id: null,
            level: null,
            is_active: true,
            sector: null,
            company: null,
            pix_key: null,
            cpf: null,
            phone: null
          });
        }
      } else if (data) {
        console.log('Profile loaded successfully:', data);
        setProfile(data);
      } else {
        // No profile found, create minimal one
        console.log('No profile data, creating fallback');
        setProfile({
          id: userId,
          role: 'partner' as any,
          name: user?.email?.split('@')[0] || 'User',
          email: user?.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization_id: null,
          level: null,
          is_active: true,
          sector: null,
          company: null,
          pix_key: null,
          cpf: null,
          phone: null
        });
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      // Always set a fallback profile to prevent infinite loading
      setProfile({
        id: userId,
        role: 'partner' as any,
        name: user?.email?.split('@')[0] || 'User',
        email: user?.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: null,
        level: null,
        is_active: true,
        sector: null,
        company: null,
        pix_key: null,
        cpf: null,
        phone: null
      });
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    let forceStopTimer: NodeJS.Timeout;

    // Force stop loading after 15 seconds to prevent infinite loading
    forceStopTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization took too long, forcing completion');
        setLoading(false);
      }
    }, 15000);

    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // Add timeout for session check
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 8000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session: currentSession }, error: sessionError } = await Promise.race([
          sessionPromise, 
          timeoutPromise
        ]) as any;
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }

        if (mounted) {
          console.log('Setting initial session:', currentSession?.user?.id ? 'User found' : 'No user');
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            // Don't await profile fetch to prevent blocking
            fetchProfile(currentSession.user.id).catch(error => {
              console.error('Initial profile fetch failed:', error);
            });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Still set loading to false even if there's an error
      } finally {
        if (mounted) {
          console.log('Auth initialization complete');
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Don't await to prevent blocking UI
          fetchProfile(session.user.id).catch(error => {
            console.error('Profile fetch in auth change failed:', error);
          });
        } else {
          setProfile(null);
        }
        
        // Always set loading to false regardless of profile fetch result
        setLoading(false);
      }
    );

    // Initialize auth state
    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(forceStopTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
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
          data: name ? { name } : undefined
        }
      });
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
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