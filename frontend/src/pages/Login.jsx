import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Styled components (unchanged)
const LoginWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background || '#f7fafc'} 0%,
    ${({ theme }) => theme.backgroundSecondary || '#e2e8f0'} 100%
  );
  padding: 1.5rem;
  @media (max-width: 768px) {
    padding: 1rem;
  }
  @media (min-width: 1280px) {
    padding: 2rem;
  }
`;

const LoginCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.border || '#edf2f7'};
  @media (max-width: 768px) {
    padding: 1.25rem;
    margin: 0 0.5rem;
    border-radius: 8px;
  }
  @media (min-width: 1280px) {
    padding: 2.5rem;
    max-width: 600px;
  }
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#2d3748'};
  margin-bottom: 1.5rem;
  text-align: center;
  @media (max-width: 768px) {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  @media (min-width: 1280px) {
    font-size: 2rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  @media (max-width: 768px) {
    gap: 0.75rem;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#2d3748'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.border || '#e2e8f0'};
  border-radius: 8px;
  font-size: 1rem;
  background: #fff;
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#2b6cb0'};
    box-shadow: 0 0 8px rgba(44, 82, 130, 0.2);
  }
  &:disabled {
    background: #f7fafc;
    cursor: not-allowed;
  }
  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
`;

const Button = styled(motion.button)`
  padding: 0.75rem;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.primary || '#2b6cb0'} 0%,
    ${({ theme }) => theme.primaryLight || '#63b3ed'} 100%
  );
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  &:hover {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.primaryHover || '#4299e1'} 0%,
      ${({ theme }) => theme.primaryLightHover || '#2c5282'} 100%
    );
    transform: translateY(-2px);
  }
  &:disabled {
    background: ${({ theme }) => theme.disabled || '#a0aec0'};
    cursor: not-allowed;
    transform: none;
    opacity: 0.7;
  }
  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
`;

const CancelButton = styled(motion.button)`
  padding: 0.75rem;
  background: #fff;
  color: ${({ theme }) => theme.text || '#2d3748'};
  border: 1px solid ${({ theme }) => theme.border || '#edf2f7'};
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
  &:hover {
    background: ${({ theme }) => theme.backgroundSecondary || '#e2e8f0'};
    transform: translateY(-2px);
  }
  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
`;

const Alert = styled(motion.p)`
  font-size: 0.875rem;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  margin: 0;
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
`;

const SuccessMessage = styled(Alert)`
  background: #d1fae5;
  color: #065f46;
`;

const ErrorMessage = styled(Alert)`
  background: #fee2e2;
  color: #991b1b;
`;

const LoadingSpinner = styled.div`
  border: 3px solid ${({ theme }) => theme.primaryLight || '#63b3ed'};
  border-top: 3px solid ${({ theme }) => theme.primary || '#2b6cb0'};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
  margin: 0.5rem auto;
  @media (min-width: 1280px) {
    width: 36px;
    height: 36px;
    border-width: 4px;
  }
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
  const [formData, setFormData] = useState({ email: '', password: '' });
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
      console.log('Redirecting user:', JSON.stringify(user, null, 2));
      navigate(user.role === 'admin' ? '/dashboard' : '/log-catch', { replace: true });
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

    setLoading(true);

    try {
      console.time('SignInRequest');
      console.log('Starting signInWithPassword with email:', formData.email);
      const { data: { user: authUser, session }, error: signInError } = await timeout(
        supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        }),
        SIGN_IN_TIMEOUT_MS
      );
      console.timeEnd('SignInRequest');
      console.log('SignIn response:', JSON.stringify({ user: authUser, session, error: signInError }, null, 2));

      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          setLocalError(t('login.errors.invalidCredentials'));
        } else {
          throw signInError;
        }
      } else if (authUser) {
        console.time('ProfileFetch');
        const { data: profile, error: profileError } = await timeout(
          supabase.from('profiles').select('role, email, name, national_id, phone').eq('id', authUser.id).single(),
          PROFILE_FETCH_TIMEOUT_MS
        );
        console.timeEnd('ProfileFetch');
        console.log('Profile fetch response:', JSON.stringify({ profile, error: profileError }, null, 2));

        if (profileError) {
          console.warn('Profile fetch failed:', profileError.message);
          setSuccess(t('login.success.login', { role: 'fisherman' }));
          navigate('/log-catch', { replace: true });
        } else {
          setSuccess(t('login.success.login', { role: profile.role || 'fisherman' }));
          navigate(profile.role === 'admin' ? '/dashboard' : '/log-catch', { replace: true });
        }
      }
    } catch (error) {
      console.error('Login error:', error.message);
      Sentry.captureException(error);
      setLocalError(error.message || t('login.errors.generic'));
      setError(error.message || t('login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ email: '', password: '' });
    setLocalError('');
    setSuccess('');
    setError(null);
    setLoading(false);
    navigate('/');
  };

  return (
    <LoginWrapper theme={theme}>
      <LoginCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
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
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
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
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
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
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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