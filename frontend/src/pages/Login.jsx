import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { css } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Shared Styles from Home.jsx
const commonStyles = css`
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const clampFontSize = (min, vw, max) => `clamp(${min}rem, ${vw}vw, ${max}rem)`;

const GradientButton = css`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.primary || '#1E3A8A'} 0%,
    ${({ theme }) => theme.primaryHover || '#3B82F6'} 100%
  );
  color: white;
  border: none;
  padding: clamp(0.75rem, 1.5vw, 1rem) clamp(1.5rem, 2.5vw, 2rem);
  font-size: ${clampFontSize(0.9, 2, 1)};
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.primaryHover || '#2563EB'} 0%,
      #1E3A8A 100%
    );
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

// Styled Components
const LoginWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#F1F5F9'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'} 100%
  );
  padding: clamp(1rem, 3vw, 2rem);
  @media (maxWidth: 768px) {
    padding: clamp(0.5rem, 2vw, 1rem);
  }
`;

const LoginCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: clamp(1.5rem, 3vw, 2rem);
  ${commonStyles}
  max-width: 600px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  @media (maxWidth: 768px) {
    padding: clamp(1rem, 2vw, 1.25rem);
    margin: 0 clamp(0.5rem, 2vw, 1rem);
    border-radius: 8px;
  }
`;

const Title = styled.h2`
  font-size: ${clampFontSize(1.5, 3, 2)};
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 2vw, 1rem);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: ${clampFontSize(0.9, 2, 1)};
`;

const Input = styled.input`
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  background: #fff;
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3B82F6'};
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
  &:disabled {
    background: #f7fafc;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  background: #fff;
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#3B82F6'};
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
  &:disabled {
    background: #f7fafc;
    cursor: not-allowed;
  }
`;

const Button = styled(motion.button)`
  ${GradientButton}
`;

const CancelButton = styled(motion.button)`
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  background: #fff;
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  border: 1px solid ${({ theme }) => theme.border || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.backgroundSecondary || '#E2E8F0'};
  }
  &:disabled {
    background: #f7fafc;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Alert = styled(motion.p)`
  font-size: ${clampFontSize(0.8, 2, 0.875)};
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border-radius: 8px;
  text-align: center;
  margin: 0;
`;

const SuccessMessage = styled(Alert)`
  background: #d1fae5;
  color: #065f46;
`;

const ErrorMessage = styled(Alert)`
  background: #fee2e2;
  color: #991b1b;
`;

const LoadingSpinner = styled(motion.div)`
  border: 4px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-top: 4px solid ${({ theme }) => theme.primary || '#3B82F6'};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
  margin: 1rem auto;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SIGN_IN_TIMEOUT_MS = 30000; // 30-second timeout
const PROFILE_FETCH_TIMEOUT_MS = 10000; // 10-second timeout

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline, loading: authLoading, error: authError, setError } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({ email: '', password: '', role: '' });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Timeout utility
  const timeout = useCallback(
    (promise, time) => {
      let timer;
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(t('login.errors.timeout'))), time);
        }),
      ]).finally(() => clearTimeout(timer));
    },
    [t]
  );

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      console.log('[Login] User Phone:', user?.user_metadata?.phone);
      console.log('[Login] Redirecting user:', JSON.stringify(user, null, 2));
      navigate(user.user_metadata?.role === 'admin' ? '/dashboard' : '/log-catch', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
    setSuccess('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
    setError(null);

    // Validate inputs
    if (!isOnline) {
      setLocalError(t('login.errors.offline'));
      return;
    }
    if (!formData.email.trim()) {
      setLocalError(t('login.errors.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setLocalError(t('login.errors.invalidEmail'));
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setLocalError(t('login.errors.passwordRequired'));
      return;
    }
    if (!formData.role) {
      setLocalError(t('login.errors.roleRequired'));
      return;
    }

    setLoading(true);

    try {
      console.log('[Login] Starting signInWithPassword with email:', formData.email);
      const { data, error } = await timeout(
        supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        }),
        SIGN_IN_TIMEOUT_MS
      );

      if (error) {
        console.error('[Login] Login error:', error.message);
        Sentry.captureException(error);
        if (error.message.includes('Invalid login')) {
          setLocalError(t('login.errors.invalidCredentials'));
        } else {
          setLocalError(t('login.errors.generic'));
          setError(error.message);
        }
        return;
      }

      if (!data || !data.user) {
        console.error('[Login] Login error: No user returned');
        Sentry.captureMessage('Login failed: No user returned');
        setLocalError(t('login.errors.noUser'));
        setError(t('login.errors.noUser'));
        return;
      }

      console.log('[Login] Login successful:', JSON.stringify(data.user, null, 2));
      console.time('ProfileFetch');
      const { data: profile, error: profileError } = await timeout(
        supabase
          .from('profiles')
          .select('role, email, name, national_id, phone')
          .eq('id', data.user.id)
          .maybeSingle(),
        PROFILE_FETCH_TIMEOUT_MS
      );
      console.timeEnd('ProfileFetch');
      console.log('[Login] Profile fetch response:', JSON.stringify({ profile, error: profileError }, null, 2));

      if (profileError) {
        console.warn('[Login] Profile fetch failed:', profileError.message);
        Sentry.captureException(profileError);
        setLocalError(t('login.errors.profileFetch'));
        setError(t('login.errors.profileFetch'));
        return;
      }

      // Validate selected role against profile or user_metadata
      const userRole = profile?.role || data.user.user_metadata?.role || 'fisherman';
      if (formData.role !== userRole) {
        setLocalError(t('login.errors.roleMismatch', { selectedRole: formData.role, actualRole: userRole }));
        setError(t('login.errors.roleMismatch', { selectedRole: formData.role, actualRole: userRole }));
        return;
      }

      console.log('[Login] User Phone:', data.user.user_metadata?.phone || profile?.phone);
      setSuccess(t('login.success.login', { role: userRole }));
      navigate(userRole === 'admin' ? '/dashboard' : '/log-catch', { replace: true });
    } catch (error) {
      console.error('[Login] Error:', error.message);
      Sentry.captureException(error);
      setLocalError(error.message || t('login.errors.generic'));
      setError(error.message || t('login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ email: '', password: '', role: '' });
    setLocalError('');
    setSuccess('');
    setError(null);
    setLoading(false);
    navigate('/');
  };

  return (
    <LoginWrapper theme={theme}>
      <LoginCard
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>{t('login.title')}</Title>
        <AnimatePresence>
          {(localError || authError) && (
            <ErrorMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
            >
              {localError || authError}
              {(localError === t('login.errors.timeout') || authError === t('login.errors.timeout')) && (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ marginTop: '0.5rem' }}
                >
                  {t('login.retry')}
                </Button>
              )}
            </ErrorMessage>
          )}
          {success && (
            <SuccessMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
            >
              {success}
            </SuccessMessage>
          )}
        </AnimatePresence>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="email">
              {t('login.email')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="email-tip"
                data-tooltip-content={t('login.tooltips.email')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('login.placeholders.email')}
              required
              aria-describedby="email-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="email-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="password">
              {t('login.password')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="password-tip"
                data-tooltip-content={t('login.tooltips.password')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t('login.placeholders.password')}
              required
              aria-describedby="password-tip"
              disabled={loading || authLoading}
            />
            <Tooltip id="password-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="role">
              {t('login.role')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="role-tip"
                data-tooltip-content={t('login.tooltips.role')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
              />
            </Label>
            <Select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              disabled={loading || authLoading}
            >
              <option value="">{t('login.placeholders.role')}</option>
              <option value="admin">{t('register.roles.admin')}</option>
              <option value="fisherman">{t('register.roles.fisherman')}</option>
            </Select>
            <Tooltip id="role-tip" />
          </FormGroup>
          <div style={{ display: 'flex', gap: clampFontSize(0.5, 2, 0.75), justifyContent: 'center', flexWrap: 'wrap' }}>
            {loading ? (
              <LoadingSpinner theme={theme} />
            ) : (
              <>
                <Button
                  type="submit"
                  disabled={loading || authLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('login.button')}
                </Button>
                <CancelButton
                  type="button"
                  onClick={handleCancel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={loading || authLoading}
                >
                  {t('cancel')}
                </CancelButton>
              </>
            )}
          </div>
        </Form>
      </LoginCard>
    </LoginWrapper>
  );
};

export default Login;