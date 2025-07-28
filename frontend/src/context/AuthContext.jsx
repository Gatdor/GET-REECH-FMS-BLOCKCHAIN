import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

export const AuthContext = createContext();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mock Supabase client for development
const mockSupabase = {
  auth: {
    getUser: async () => {
      console.log('Mock getUser called');
      return { data: { user: null }, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      console.log('Mock signInWithPassword:', { email, password });
      if (email === 'test@example.com' && password === 'password123') {
        return {
          data: {
            user: {
              id: 'mock-user-id',
              email,
              user_metadata: { role: 'fisherman', email, name: 'Test User', national_id: '123456', phone: '1234567890' },
            },
            session: {},
          },
          error: null,
        };
      }
      return { data: null, error: new Error('Invalid login credentials') };
    },
    signOut: async () => {
      console.log('Mock signOut called');
      return { error: null };
    },
    onAuthStateChange: (callback) => {
      console.log('Mock onAuthStateChange initialized');
      setTimeout(() => callback('INITIAL_SESSION', { user: null, session: null }), 0);
      return {
        data: { subscription: { unsubscribe: () => console.log('Mock auth listener unsubscribed') } },
      };
    },
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: { role: 'fisherman', email: 'test@example.com', name: 'Test User', national_id: '123456', phone: '1234567890' },
          error: null,
        }),
      }),
    }),
  }),
};

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or anon key missing in environment variables');
}

export const supabase =
  import.meta.env.VITE_NODE_ENV === 'development'
    ? mockSupabase
    : createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: {
            getItem: async (key) => await get(key),
            setItem: async (key, value) => await set(key, value),
            removeItem: async (key) => await set(key, null),
          },
          persistSession: true,
        },
      });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Timeout utility
  const timeout = (promise, time, errorMessage = 'Auth request timed out') => {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMessage)), time);
      }),
    ]).finally(() => clearTimeout(timer));
  };

  const loadUser = async () => {
    try {
      console.log('loadUser started');
      const cachedUser = await get('user').catch((err) => {
        console.warn('Failed to access idb-keyval:', err.message);
        Sentry.captureException(err);
        return null;
      });
      if (cachedUser && isOnline) {
        console.log('Loaded cached user:', JSON.stringify(cachedUser, null, 2));
        setUser(cachedUser);
        setLoading(false);
        return;
      }

      console.log('Checking auth user...');
      const { data: { user }, error: userError } = await timeout(
        supabase.auth.getUser(),
        5000,
        'Failed to fetch user'
      );
      if (userError) {
        console.warn('getUser error:', userError.message);
        if (userError.message.includes('Auth session missing')) {
          setUser(null);
          await set('user', null).catch((err) => console.warn('Failed to clear idb-keyval:', err.message));
          setLoading(false);
          return;
        }
        throw userError;
      }

      if (user) {
        console.log('Fetching user profile for user ID:', user.id);
        const { data: profiles, error: profileError } = await timeout(
          supabase
            .from('profiles')
            .select('role, email, name, national_id, phone')
            .eq('id', user.id),
          5000,
          'Failed to fetch profile'
        );

        if (profileError) {
          console.warn('Profile fetch failed:', profileError.message);
          Sentry.captureException(profileError);
          setError('Failed to fetch user profile');
          // Fallback to user metadata
          const userWithMetadata = {
            ...user,
            role: user.user_metadata?.role || 'fisherman',
            email: user.user_metadata?.email || user.email,
            name: user.user_metadata?.name || '',
            national_id: user.user_metadata?.national_id || '',
            phone: user.user_metadata?.phone || '',
          };
          console.log('Using user metadata as fallback:', JSON.stringify(userWithMetadata, null, 2));
          setUser(userWithMetadata);
          await set('user', userWithMetadata).catch((err) => console.warn('Failed to set idb-keyval:', err.message));
        } else if (profiles && profiles.length === 1) {
          const profile = profiles[0];
          const userWithRole = {
            ...user,
            role: profile.role || user.user_metadata?.role || 'fisherman',
            email: profile.email || user.user_metadata?.email || user.email,
            name: profile.name || user.user_metadata?.name || '',
            national_id: profile.national_id || user.user_metadata?.national_id || '',
            phone: profile.phone || user.user_metadata?.phone || '',
          };
          console.log('Loaded user:', JSON.stringify(userWithRole, null, 2));
          setUser(userWithRole);
          await set('user', userWithRole).catch((err) => console.warn('Failed to set idb-keyval:', err.message));
        } else {
          console.warn('Profile fetch returned unexpected rows:', profiles ? profiles.length : 0);
          Sentry.captureMessage(`Profile fetch returned ${profiles ? profiles.length : 0} rows for user ID ${user.id}`);
          setError('Invalid profile data');
          const userWithMetadata = {
            ...user,
            role: user.user_metadata?.role || 'fisherman',
            email: user.user_metadata?.email || user.email,
            name: user.user_metadata?.name || '',
            national_id: user.user_metadata?.national_id || '',
            phone: user.user_metadata?.phone || '',
          };
          console.log('Using user metadata as fallback:', JSON.stringify(userWithMetadata, null, 2));
          setUser(userWithMetadata);
          await set('user', userWithMetadata).catch((err) => console.warn('Failed to set idb-keyval:', err.message));
        }
      } else {
        console.log('No user found from getUser');
        setUser(null);
        await set('user', null).catch((err) => console.warn('Failed to clear idb-keyval:', err.message));
      }
    } catch (error) {
      console.error('Error loading user:', error.message);
      Sentry.captureException(error);
      setError(error.message || 'Failed to load user');
      setUser(null);
      await set('user', null).catch((err) => console.warn('Failed to clear idb-keyval:', err.message));
    } finally {
      console.log('loadUser completed, setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AuthProvider useEffect triggered');
    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, JSON.stringify(session, null, 2));
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setError(null);
        await set('user', null).catch((err) => console.warn('Failed to clear idb-keyval:', err.message));
      }
    });

    const handleOnline = () => {
      console.log('Network status: online');
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log('Network status: offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      console.log('Cleaning up AuthProvider useEffect');
      authListener.subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, supabase, isOnline, loading, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};