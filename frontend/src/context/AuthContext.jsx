// src/context/AuthContext.jsx
import React, { useState, useEffect, useContext, createContext, useRef, useCallback } from 'react';

import { createClient } from '@supabase/supabase-js';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';
import { debounce } from 'lodash';

export const AuthContext = createContext();

// Initialize environment variables
const env = import.meta.env.VITE_ENV || import.meta.env.NODE_ENV || import.meta.env.MODE || 'development';

// Mock Supabase client for development
const mockSupabase = {
  auth: {
    getUser: async () => {
      console.debug('[Auth] Mock getUser called');
      return { data: { user: null }, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      console.debug('[Auth] Mock signInWithPassword:', { email, password });
      if (email === 'test@example.com' && password === 'password123') {
        return {
          data: {
            user: {
              id: 'mock-user-id',
              email,
              user_metadata: {
                role: 'fisherman',
                email,
                name: 'Test User',
                national_id: '123456',
                phone: '+254712345678',
              },
              phone: '+254712345678',
            },
            session: {},
          },
          error: null,
        };
      }
      return { data: null, error: new Error('Invalid login credentials') };
    },
    signOut: async () => {
      console.debug('[Auth] Mock signOut called');
      return { error: null };
    },
    onAuthStateChange: (callback) => {
      console.debug('[Auth] Mock onAuthStateChange initialized');
      setTimeout(() => callback('INITIAL_SESSION', { user: null, session: null }), 0);
      return {
        data: { subscription: { unsubscribe: () => console.debug('[Auth] Mock auth listener unsubscribed') } },
      };
    },
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          single: async () => ({
            data: {
              role: 'fisherman',
              email: 'test@example.com',
              name: 'Test User',
              national_id: '123456',
              phone: '+254712345678',
            },
            error: null,
          }),
          limit: () => ({
            data: [
              {
                batch_id: 'mock-batch-1',
                species: 'Tuna',
                weight: 10,
                price: 1000,
                quality_score: 0.9,
                image_urls: ['ipfs://mock-image'],
                user_id: 'mock-user-id',
                status: 'approved',
                latitude: -4.0435,
                longitude: 39.6682,
                created_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        }),
        single: async () => ({
          data: {
            role: 'fisherman',
            email: 'test@example.com',
            name: 'Test User',
            national_id: '123456',
            phone: '+254712345678',
          },
          error: null,
        }),
      }),
    }),
  }),
};



// Validate environment variables
const isDev = env === 'development';
if (!isDev && (!supabaseUrl || !supabaseKey)) {
  const error = new Error('Supabase URL or anon key missing. Falling back to mock client.');
  console.warn('[Auth] ' + error.message);
  Sentry.captureException(error);
}

// Initialize Supabase client
export const supabase = isDev || !supabaseUrl || !supabaseKey
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
  const isLoadingUser = useRef(false);
  const lastUserHash = useRef(null);

  // Simplified timeout utility
  const withTimeout = (promise, ms, errorMessage) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
    ]);

  // Debounced loadUser
  const loadUser = debounce(async () => {
    if (isLoadingUser.current) {
      console.debug('[Auth] loadUser already in progress, skipping');
      return;
    }
    isLoadingUser.current = true;
    setLoading(true);
    try {
      console.debug('[Auth] loadUser started');
      const cachedUser = await get('user').catch((err) => {
        console.warn('[Auth] Failed to access idb-keyval:', err.message);
        Sentry.captureException(err);
        return null;
      });

      if (cachedUser && !isOnline) {
        console.debug('[Auth] Using cached user (offline):', cachedUser);
        setUser(cachedUser);
        setLoading(false);
        return;
      }

      console.debug('[Auth] Fetching auth user...');
      const { data: { user }, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'Failed to fetch user'
      );

      if (userError) {
        console.warn('[Auth] getUser error:', userError.message);
        Sentry.captureException(userError);
        if (userError.message.includes('Auth session missing')) {
          setUser(null);
          await set('user', null).catch((err) => console.warn('[Auth] Failed to clear idb-keyval:', err.message));
          setLoading(false);
          return;
        }
        throw userError;
      }

      if (user) {
        console.debug('[Auth] Fetching user profile for user ID:', user.id);
        let userWithRole = { ...user };

        if (isOnline && !isDev) {
          const { data: profile, error: profileError } = await withTimeout(
            supabase
              .from('profiles')
              .select('role, email, name, national_id, phone')
              .eq('id', user.id)
              .single(),
            5000,
            'Failed to fetch profile'
          );

          if (profileError) {
            console.warn('[Auth] Profile fetch failed:', profileError.message);
            Sentry.captureException(profileError);
            // Fallback to user_metadata if profile fetch fails
            userWithRole = {
              ...user,
              user_metadata: {
                role: user.user_metadata?.role || 'fisherman',
                email: user.user_metadata?.email || user.email,
                name: user.user_metadata?.name || '',
                national_id: user.user_metadata?.national_id || '',
                phone: user.user_metadata?.phone || user.phone || '',
              },
              phone: user.user_metadata?.phone || user.phone || '',
            };
          } else {
            userWithRole = {
              ...user,
              user_metadata: {
                role: profile?.role || user.user_metadata?.role || 'fisherman',
                email: profile?.email || user.email,
                name: profile?.name || user.user_metadata?.name || '',
                national_id: profile?.national_id || user.user_metadata?.national_id || '',
                phone: profile?.phone || user.user_metadata?.phone || user.phone || '',
              },
              phone: profile?.phone || user.user_metadata?.phone || user.phone || '',
            };
            // Insert profile if none exists
            if (!profile) {
              console.debug('[Auth] No profile found, inserting new profile');
              await supabase.from('profiles').insert({
                id: user.id,
                role: user.user_metadata?.role || 'fisherman',
                email: user.email,
                name: user.user_metadata?.name || '',
                national_id: user.user_metadata?.national_id || '',
                phone: user.user_metadata?.phone || user.phone || '',
              });
            }
          }
        } else {
          console.debug('[Auth] Using user metadata (offline or dev):', user);
          userWithRole = {
            ...user,
            user_metadata: {
              role: user.user_metadata?.role || 'fisherman',
              email: user.user_metadata?.email || user.email,
              name: user.user_metadata?.name || '',
              national_id: user.user_metadata?.national_id || '',
              phone: user.user_metadata?.phone || user.phone || '',
            },
            phone: user.user_metadata?.phone || user.phone || '',
          };
        }

        const userHash = JSON.stringify(userWithRole);
        if (lastUserHash.current !== userHash) {
          console.debug('[Auth] Loaded user:', userWithRole);
          setUser(userWithRole);
          await set('user', userWithRole).catch((err) => console.warn('[Auth] Failed to set idb-keyval:', err.message));
          lastUserHash.current = userHash;
        } else {
          console.debug('[Auth] No user change, skipping state update');
        }
      } else {
        console.debug('[Auth] No user found from getUser');
        setUser(null);
        await set('user', null).catch((err) => console.warn('[Auth] Failed to clear idb-keyval:', err.message));
      }
    } catch (error) {
      console.error('[Auth] Error loading user:', error.message);
      Sentry.captureException(error);
      setError(error.message || 'Failed to load user');
      setUser(null);
      await set('user', null).catch((err) => console.warn('[Auth] Failed to clear idb-keyval:', err.message));
    } finally {
      console.debug('[Auth] loadUser completed');
      setLoading(false);
      isLoadingUser.current = false;
    }
  }, 300);

  // Logout function
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setError(null);
      lastUserHash.current = null;
      await set('user', null).catch((err) => console.warn('[Auth] Failed to clear idb-keyval:', err.message));
    } catch (error) {
      console.error('[Auth] Logout error:', error.message);
      Sentry.captureException(error);
      setError(error.message || 'Failed to logout');
    }
  };

  // Debounce auth state changes to prevent duplicates
  const handleAuthStateChange = useCallback(
    debounce((event, session) => {
      console.debug('[Auth] Auth event:', event, session);
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        console.debug('[Auth] User signed out');
        setUser(null);
        setError(null);
        lastUserHash.current = null;
        set('user', null).catch((err) => console.warn('[Auth] Failed to clear idb-keyval:', err.message));
      }
    }, 300),
    []
  );

  useEffect(() => {
    console.debug('[Auth] AuthProvider useEffect triggered');
    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    const handleOnline = () => {
      console.debug('[Auth] Network status: online');
      setIsOnline(true);
      loadUser();
    };
    const handleOffline = () => {
      console.debug('[Auth] Network status: offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      console.debug('[Auth] Cleaning up AuthProvider useEffect');
      authListener.subscription?.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      loadUser.cancel();
      handleAuthStateChange.cancel();
    };
  }, [handleAuthStateChange]);

  return (
    <AuthContext.Provider value={{ user, setUser, supabase, isOnline, loading, error, setError, logout }}>
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