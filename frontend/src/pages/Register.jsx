import React, { useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { set, get } from 'idb-keyval';
import * as Sentry from '@sentry/react';

// Styled components
const RegisterWrapper = styled.div`
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

const RegisterCard = styled(motion.div)`
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

const Select = styled.select`
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

const ErrorMessage = styled(motion.p)`
  font-size: 0.875rem;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
  margin: 0;
  background: #fee2e2;
  color: #991b1b;
  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
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

const REGISTER_TIMEOUT_MS = 80000;

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { supabase, isOnline } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({
    name: '',
    nationalId: '',
    phone: '',
    email: '',
    password: '',
    role: 'fisherman',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Timeout utility
  const timeout = useCallback((promise, time) => {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(t('register.errors.timeout'))), time);
      }),
    ]).finally(() => clearTimeout(timer));
  }, [t]);

  const validateForm = () => {
    if (!formData.name.trim()) return t('register.errors.nameRequired');
    if (!/^\d{8,}$/.test(formData.nationalId)) return t('register.errors.invalidNationalId');
    if (!/^\+2547\d{8}$/.test(formData.phone)) return t('register.errors.invalidPhone');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return t('register.errors.invalidEmail');
    if (formData.password.length < 6) return t('register.errors.passwordTooShort');
    return '';
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      console.time('Register');
      if (isOnline) {
        const { data, error: authError } = await timeout(
          supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                name: formData.name,
                national_id: formData.nationalId,
                phone: formData.phone,
                role: formData.role,
              },
            },
          }),
          REGISTER_TIMEOUT_MS
        );

        if (authError) {
          if (authError.message.includes('Email not confirmed')) {
            setError(t('register.errors.emailNotConfirmed'));
          } else {
            throw authError;
          }
        }

        await timeout(
          supabase.from('profiles').insert({
            id: data.user.id,
            name: formData.name,
            national_id: formData.nationalId,
            phone: formData.phone,
            role: formData.role,
          }),
          5000
        );

        setError(t('register.success'));
        navigate('/login');
      } else {
        await set('offlineRegistrations', [
          ...(await get('offlineRegistrations') || []),
          { ...formData, timestamp: Date.now() },
        ]);
        setError(t('register.offlineSuccess'));
        navigate('/login');
      }
    } catch (error) {
      console.error('Register error:', error);
      Sentry.captureException(error);
      setError(error.message || t('register.errors.generic'));
    } finally {
      console.timeEnd('Register');
      setLoading(false);
    }
  };

  return (
    <RegisterWrapper theme={theme}>
      <RegisterCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Title>{t('register.title')}</Title>
        <AnimatePresence>
          {error && (
            <ErrorMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
            >
              {error}
            </ErrorMessage>
          )}
        </AnimatePresence>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">
              {t('register.name')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="name-tip"
                data-tooltip-content={t('register.tooltips.name')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
              />
            </Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('register.placeholders.name')}
              required
              aria-describedby="name-tip"
              disabled={loading}
            />
            <Tooltip id="name-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="nationalId">
              {t('register.nationalId')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="id-tip"
                data-tooltip-content={t('register.tooltips.nationalId')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
              />
            </Label>
            <Input
              type="text"
              id="nationalId"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              placeholder={t('register.placeholders.nationalId')}
              required
              aria-describedby="id-tip"
              disabled={loading}
            />
            <Tooltip id="id-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="phone">
              {t('register.phone')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="phone-tip"
                data-tooltip-content={t('register.tooltips.phone')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
              />
            </Label>
            <Input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('register.placeholders.phone')}
              required
              aria-describedby="phone-tip"
              disabled={loading}
            />
            <Tooltip id="phone-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="email">
              {t('register.email')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="email-tip"
                data-tooltip-content={t('register.tooltips.email')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
              />
            </Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('register.placeholders.email')}
              required
              aria-describedby="email-tip"
              disabled={loading}
            />
            <Tooltip id="email-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="password">
              {t('register.password')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="password-tip"
                data-tooltip-content={t('register.tooltips.password')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
              />
            </Label>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t('register.placeholders.password')}
              required
              aria-describedby="password-tip"
              disabled={loading}
            />
            <Tooltip id="password-tip" />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="role">
              {t('register.role')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="role-tip"
                data-tooltip-content={t('register.tooltips.role')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
              />
            </Label>
            <Select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              aria-describedby="role-tip"
              disabled={loading}
            >
              <option value="fisherman">{t('register.roles.fisherman')}</option>
              <option value="admin">{t('register.roles.admin')}</option>
            </Select>
            <Tooltip id="role-tip" />
          </FormGroup>
          {loading ? (
            <LoadingSpinner theme={theme} />
          ) : (
            <Button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('register.submit')}
            </Button>
          )}
        </Form>
      </RegisterCard>
    </RegisterWrapper>
  );
};

export default Register;