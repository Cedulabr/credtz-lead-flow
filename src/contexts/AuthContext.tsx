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

  // Cache to prevent duplicate fetches
  const profileCache = React.useRef<{ [key: string]: { data: Profile | null, timestamp: number } }>({});
  const fetchingProfile = React.useRef<{ [key: string]: Promise<void> | null }>({});

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    if (!userId) return;
    
    // Check cache (valid for 30 seconds)
    const cached = profileCache.current[userId];
    if (cached && Date.now() - cached.timestamp < 30000) {
      setProfile(cached.data);
      setProfileLoading(false);
      return;
    }

    // Prevent concurrent fetches for same user
    if (fetchingProfile.current[userId]) {
      return fetchingProfile.current[userId];
    }

    const fetchPromise = (async () => {
      fetchingProfile.current[userId] = fetchPromise;
    
      // Prevent multiple concurrent fetches
      if (retryCount === 0) {
        setProfileLoading(true);
      }
    
    try {
      console.log('Fetching profile for user:', userId, `(attempt ${retryCount + 1})`);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error fetching profile:', error);
        
        // Handle network errors with exponential backoff
        if ((error.message?.includes('Failed to fetch') || 
             error.message?.includes('timeout') || 
             error.message?.includes('aborted')) && retryCount < 2) {
          
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`Network error, retrying in ${delay}ms...`);
          
          fetchingProfile.current[userId] = null;
          setTimeout(() => {
            fetchProfile(userId, retryCount + 1);
          }, delay);
          return;
        }
        
        // Only try to create profile if it doesn't exist
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
              setProfile(null);
            } else {
              setProfile(newProfile);
            }
          } catch (createError) {
            console.error('Failed to create profile:', createError);
            setProfile(null);
          }
        } else {
          // For other errors, set profile to null to show retry UI
          setProfile(null);
        }
        
      } else if (data) {
        console.log('Profile loaded successfully:', data);
        profileCache.current[userId] = { data, timestamp: Date.now() };
        setProfile(data);
      } else {
        // No profile found but no error, try to create one
        console.log('No profile data, attempting to create one...');
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
            setProfile(null);
          } else {
            setProfile(newProfile);
          }
        } catch (createError) {
          console.error('Failed to create profile:', createError);
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      
      // Handle fetch errors with limited retries
      if (retryCount < 1) {
        const delay = 2000;
        console.log(`Unexpected error, retrying in ${delay}ms...`);
        fetchingProfile.current[userId] = null;
        setTimeout(() => {
          fetchProfile(userId, retryCount + 1);
        }, delay);
        return;
      }
      
      // After all retries failed, set profile to null
      setProfile(null);
    } finally {
      // Only stop loading on the final attempt or success
      if (retryCount >= 2 || profile !== undefined) {
        setProfileLoading(false);
      }
      fetchingProfile.current[userId] = null;
    }
    })();

    fetchingProfile.current[userId] = fetchPromise;
    return fetchPromise;
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    let forceStopTimer: NodeJS.Timeout;

    // Force stop loading after 10 seconds to prevent infinite loading
    forceStopTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization took too long, forcing completion');
        setLoading(false);
        setProfileLoading(false);
      }
    }, 10000);

    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // Get session with a reasonable timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }

        if (mounted) {
          console.log('Setting initial session:', currentSession?.user?.id ? 'User found' : 'No user');
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            // Fetch profile but don't block initialization
            setTimeout(() => {
              fetchProfile(currentSession.user.id).catch(error => {
                console.error('Initial profile fetch failed:', error);
              });
            }, 100);
          }
          
          // Set loading to false regardless of profile fetch
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Debounce profile fetch to prevent rapid calls
          setTimeout(() => {
            fetchProfile(session.user.id).catch(error => {
              console.error('Profile fetch in auth change failed:', error);
            });
          }, 200);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
        
        // Auth loading is done regardless of profile state
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
  }, []);

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