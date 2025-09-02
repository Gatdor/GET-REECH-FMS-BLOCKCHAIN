import React, { useContext, useEffect, useCallback, useState } from 'react';
import { Routes, Route, NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';
import * as Sentry from '@sentry/react';
import { get, set } from 'idb-keyval';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Privacy from './pages/Privacy';
import CatchLog from './pages/CatchLog';
import Dashboard from './pages/Dashboard';
import AdminUsers from './pages/AdminUsers';
import AdminCatchLogs from './pages/AdminCatchLogs';
import Market from './pages/Market';

// Page transition animations
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  duration: 0.4,
  ease: 'easeInOut',
};

// Styled components with fixed media queries
const AppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#f7fafc'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#e2e8f0'} 100%
  );
  color: ${({ theme }) => theme.text || '#2d3748'};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Header = styled.header`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 1rem 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid ${({ theme }) => theme.border || '#edf2f7'};
  @media screen and (max-width: 768px) {
    padding: 0.75rem 1rem;
  }
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1280px;
  margin: 0 auto;
  flex-wrap: wrap;
  gap: 1rem;
  @media screen and (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }
`;

const StyledNavLink = styled(motion.create(RouterNavLink))`
  color: ${({ theme }) => theme.primary || '#2b6cb0'};
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  transition: background 0.3s, color 0.3s, transform 0.2s;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#4299e1'};
    color: white;
    transform: translateY(-2px);
  }
  &.active {
    background: ${({ theme }) => theme.primary || '#2b6cb0'};
    color: white;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#2b6cb0'};
    outline-offset: 2px;
  }
  @media screen and (max-width: 768px) {
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    width: 100%;
    text-align: center;
  }
  @media screen and (min-width: 1280px) {
    font-size: 1.2rem;
    padding: 0.75rem 2rem;
  }
`;

const LanguageButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.primary || '#2b6cb0'};
  color: ${({ theme }) => theme.primary || '#2b6cb0'};
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s, color 0.3s;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#4299e1'};
    color: white;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#2b6cb0'};
    outline-offset: 2px;
  }
  @media screen and (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }
`;

const Button = styled(motion.button)`
  padding: 0.75rem 1.75rem;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.primary || '#2b6cb0'} 0%,
    ${({ theme }) => theme.primaryLight || '#63b3ed'} 100%
  );
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  &:hover {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.primaryHover || '#2c5282'} 0%,
      ${({ theme }) => theme.primaryLightHover || '#4299e1'} 100%
    );
    transform: translateY(-2px);
  }
  &:disabled {
    background: ${({ theme }) => theme.disabled || '#a0aec0'};
    cursor: not-allowed;
    transform: none;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#2b6cb0'};
    outline-offset: 2px;
  }
  @media screen and (max-width: 768px) {
    font-size: 0.95rem;
    padding: 0.5rem 1rem;
    width: 100%;
  }
  @media screen and (min-width: 1280px) {
    font-size: 1.2rem;
    padding: 0.75rem 2rem;
  }
`;

const Main = styled(motion.main)`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  max-width: 1280px;
  margin: 1.5rem auto;
  width: 100%;
  background: ${({ theme }) => theme.card || '#ffffff'};
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  @media screen and (max-width: 768px) {
    padding: 1rem;
    margin: 1rem 0.5rem;
    border-radius: 8px;
  }
  @media screen and (min-width: 1280px) {
    padding: 3rem;
    margin: 2rem auto;
  }
`;

const LoadingOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
`;

const LoadingSpinner = styled.div`
  border: 4px solid ${({ theme }) => theme.primaryLight || '#63b3ed'};
  border-top: 4px solid ${({ theme }) => theme.primary || '#2b6cb0'};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  @media screen and (max-width: 768px) {
    width: 32px;
    height: 32px;
    border-width: 3px;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#f7fafc'};
  color: ${({ theme }) => theme.text || '#2d3748'};
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  gap: 1rem;
  padding: 1.5rem;
  @media screen and (max-width: 768px) {
    font-size: 1rem;
    gap: 0.75rem;
    padding: 1rem;
  }
  @media screen and (min-width: 1280px) {
    font-size: 1.5rem;
    gap: 1.5rem;
  }
`;

const App = () => {
  const { t, i18n } = useTranslation();
  const { user, supabase, logout, loading, error, isOnline, setError } = useAuth();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(false);

  // Sync offline updates
  const syncOfflineUpdates = useCallback(async () => {
    if (!isOnline || !user) return;
    try {
      const updates = (await get('offlineProfileUpdates')) || [];
      for (const update of updates) {
        if (update.user_id === user.id) {
          const { error: dbError } = await supabase
            .from('profiles')
            .update({
              name: update.name,
              national_id: update.national_id,
              phone: update.phone,
            })
            .eq('id', user.id);
          if (!dbError) {
            await set('offlineProfileUpdates', updates.filter((u) => u.user_id !== user.id));
          }
        }
      }
    } catch (err) {
      console.error('[App] Offline sync error:', err.message);
      Sentry.captureException(err);
    }
  }, [isOnline, user, supabase]);

  // Debug auth state and sync offline updates
  useEffect(() => {
    console.log('[App] Auth State:', JSON.stringify({ user, loading, error, isOnline }, null, 2));
    console.log('[App] User Phone:', user?.user_metadata?.phone);
    syncOfflineUpdates();
  }, [user, loading, error, isOnline, syncOfflineUpdates]);

  // Handle auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[App] Auth event:', event, JSON.stringify(session, null, 2));
      if (event === 'SIGNED_IN' && session?.user) {
        navigate(session.user.user_metadata?.role === 'admin' ? '/dashboard' : '/log-catch', {
          replace: true,
        });
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });
    return () => authListener.subscription?.unsubscribe();
  }, [supabase, navigate]);

  const handleLogout = async () => {
    try {
      setAuthLoading(true);
      await logout();
    } catch (err) {
      console.error('[App] Logout error:', err.message);
      Sentry.captureException(err);
      setError(t('app.error', { message: err.message }));
    } finally {
      setAuthLoading(false);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  // Show error for network or auth issues
  if (error || !isOnline) {
    return (
      <ErrorWrapper theme={theme}>
        <div>{error ? t('app.error', { message: error }) : t('app.offline')}</div>
        <Button
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={t('Retry')}
        >
          {t('Retry')}
        </Button>
      </ErrorWrapper>
    );
  }

  // Show loading overlay during initial auth check
  if (loading) {
    return (
      <LoadingOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <LoadingSpinner theme={theme} />
      </LoadingOverlay>
    );
  }

  return (
    <AppWrapper theme={theme}>
      {authLoading && (
        <LoadingOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <LoadingSpinner theme={theme} />
        </LoadingOverlay>
      )}
      <Header theme={theme}>
        <Nav>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <StyledNavLink
              to="/"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={t('Home')}
            >
              {t('Home')}
            </StyledNavLink>
            {user && (
              <>
                <StyledNavLink
                  to={user.user_metadata?.role === 'admin' ? '/dashboard' : '/log-catch'}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t(user.user_metadata?.role === 'admin' ? 'Dashboard' : 'LogCatch')}
                >
                  {t(user.user_metadata?.role === 'admin' ? 'Dashboard' : 'LogCatch')}
                </StyledNavLink>
                <StyledNavLink
                  to="/market"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('exploreMarket')}
                >
                  {t('exploreMarket')}
                </StyledNavLink>
                <StyledNavLink
                  to="/profile"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('profile')}
                >
                  {t('profile')}
                </StyledNavLink>
                <StyledNavLink
                  to="/privacy"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('privacy')}
                >
                  {t('privacy')}
                </StyledNavLink>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <LanguageButton
              onClick={() => changeLanguage('en')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Switch to English"
            >
              EN
            </LanguageButton>
            <LanguageButton
              onClick={() => changeLanguage('sw')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Switch to Swahili"
            >
              SW
            </LanguageButton>
            {user ? (
              <Button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={authLoading}
                aria-label={t('Logout')}
              >
                {t('Logout')}
              </Button>
            ) : (
              <>
                <StyledNavLink
                  to="/login"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('Login')}
                >
                  {t('Login')}
                </StyledNavLink>
                <StyledNavLink
                  to="/register"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t('Register')}
                >
                  {t('Register')}
                </StyledNavLink>
              </>
            )}
          </div>
        </Nav>
      </Header>
      <Main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="profile" element={<Profile />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="log-catch" element={<CatchLog />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/catch-logs" element={<AdminCatchLogs />} />
          <Route path="admin/market" element={<Market />} />
          <Route path="market" element={<Market />} />
        </Routes>
      </Main>
    </AppWrapper>
  );
};

export default App;