import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

const ProfileWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, ${({ theme }) => theme.background || '#f9fafb'} 0%, #e5e7eb 100%);
  padding: 1.5rem;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ProfileCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#e5e7eb'};
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin-bottom: 0.5rem;
  text-align: center;
`;

const WelcomeMessage = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.textSecondary || '#6b7280'};
  text-align: center;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#1f2937'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#d1d5db'};
  border-radius: 8px;
  font-size: 1rem;
  background: #fff;
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#1e40af'};
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(30, 64, 175, 0.2);
  }
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const RoleDisplay = styled.p`
  color: ${({ theme }) => theme.text || '#1f2937'};
  font-size: 1rem;
  font-weight: 500;
  background: ${({ theme }) => theme.background || '#f9fafb'};
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
`;

const Button = styled(motion.button)`
  padding: 0.75rem;
  background: linear-gradient(90deg, ${({ theme }) => theme.primary || '#1e40af'} 0%, #3b82f6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  &:hover {
    background: linear-gradient(90deg, ${({ theme }) => theme.primaryHover || '#1e3a8a'} 0%, #2563eb 100%);
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6b7280'};
    cursor: not-allowed;
    opacity: 0.6;
  }
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#1e40af'};
    outline-offset: 2px;
  }
`;

const Alert = styled(motion.p)`
  font-size: 0.875rem;
  padding: 0.75rem;
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

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({
    name: '',
    nationalId: '',
    phone: '',
    role: 'fisherman',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (dbError) throw dbError;
      setFormData({
        name: data.name || '',
        nationalId: data.national_id || '',
        phone: data.phone || '',
        role: data.role || 'fisherman',
      });
    } catch (error) {
      Sentry.captureException(error);
      setError(error.message || t('profile.errors.generic'));
    }
  }, [user, supabase, t]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isOnline) fetchProfile();
    else {
      get('offlineProfileUpdates').then((updates) => {
        if (updates && updates.length > 0) {
          const latestUpdate = updates.find((update) => update.user_id === user.id);
          if (latestUpdate) {
            setFormData({
              name: latestUpdate.name || '',
              nationalId: latestUpdate.national_id || '',
              phone: latestUpdate.phone || '',
              role: formData.role,
            });
            setSuccess(t('profile.successOffline'));
          }
        }
      });
    }
  }, [user, isOnline, navigate, fetchProfile, t, formData.role]);

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) return t('profile.errors.nameRequired');
    if (!/^\d{8,}$/.test(formData.nationalId)) return t('profile.errors.invalidNationalId');
    if (!/^\+2547\d{8}$/.test(formData.phone)) return t('profile.errors.invalidPhone');
    return '';
  }, [formData, t]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const data = {
        name: formData.name,
        national_id: formData.nationalId,
        phone: formData.phone,
      };

      if (isOnline) {
        const { error: dbError } = await supabase.from('profiles').update(data).eq('id', user.id);
        if (dbError) throw dbError;
        setSuccess(t('profile.success'));
      } else {
        await set('offlineProfileUpdates', [
          ...(await get('offlineProfileUpdates') || []),
          { user_id: user.id, ...data, timestamp: Date.now() },
        ]);
        setSuccess(t('profile.successOffline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(error.message || t('profile.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProfileWrapper theme={theme}>
      <ProfileCard
        theme={theme}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Title>{t('profile.title')}</Title>
        <WelcomeMessage>{t('profile.welcome', { role: t(`register.roles.${formData.role}`) })}</WelcomeMessage>
        <AnimatePresence>
          {error && (
            <ErrorMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
              aria-live="assertive"
            >
              {error}
            </ErrorMessage>
          )}
          {success && (
            <SuccessMessage
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="alert"
              aria-live="polite"
            >
              {success}
            </SuccessMessage>
          )}
        </AnimatePresence>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">
              {t('profile.name')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="name-tip"
                data-tooltip-content={t('profile.tooltips.name')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
                aria-hidden="true"
              />
            </Label>
            <Input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('profile.placeholders.name')}
              required
              aria-describedby="name-tip"
            />
            <Tooltip id="name-tip" />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="nationalId">
              {t('profile.nationalId')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="nationalId-tip"
                data-tooltip-content={t('profile.tooltips.nationalId')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
                aria-hidden="true"
              />
            </Label>
            <Input
              id="nationalId"
              type="text"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              placeholder={t('profile.placeholders.nationalId')}
              required
              aria-describedby="nationalId-tip"
            />
            <Tooltip id="nationalId-tip" />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="phone">
              {t('profile.phone')}
              <FontAwesomeIcon
                icon={faInfoCircle}
                data-tooltip-id="phone-tip"
                data-tooltip-content={t('profile.tooltips.phone')}
                style={{ cursor: 'pointer', color: theme.textSecondary || '#6b7280' }}
                aria-hidden="true"
              />
            </Label>
            <Input
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('profile.placeholders.phone')}
              required
              aria-describedby="phone-tip"
            />
            <Tooltip id="phone-tip" />
          </FormGroup>

          <FormGroup>
            <Label>{t('profile.role')}</Label>
            <RoleDisplay aria-live="polite">{t(`register.roles.${formData.role}`)}</RoleDisplay>
          </FormGroup>

          <Button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            aria-label={loading ? t('profile.submitting') : t('profile.submit')}
          >
            {loading ? t('profile.submitting') : t('profile.submit')}
          </Button>
        </Form>
      </ProfileCard>
    </ProfileWrapper>
  );
};

export default Profile;