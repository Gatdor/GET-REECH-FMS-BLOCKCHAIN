import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

const DashboardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background || '#f9fafb'};
  padding: 2rem;
`;

const DashboardCard = styled.div`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 1000px;
  width: 100%;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
`;

const Th = styled.th`
  padding: 0.75rem;
  background: ${({ theme }) => theme.primary || '#1e40af'};
  color: white;
  text-align: left;
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.textSecondary || '#6b7280'};
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.primary || '#1e40af'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#1e3a8a'};
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6b7280'};
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
`;

const validateListing = (listing) => {
  const errors = [];
  if (!listing?.species || typeof listing.species !== 'string' || listing.species.trim() === '') {
    errors.push('Invalid or missing species');
  }
  if (!listing?.weight || typeof listing.weight !== 'number' || listing.weight <= 0) {
    errors.push('Weight must be a positive number');
  }
  if (!listing?.price || typeof listing.price !== 'number' || listing.price <= 0) {
    errors.push('Price must be a positive number');
  }
  if (
    !listing?.quality_score ||
    typeof listing.quality_score !== 'number' ||
    listing.quality_score < 0 ||
    listing.quality_score > 1
  ) {
    errors.push('Quality score must be between 0 and 1');
  }
  if (!Array.isArray(listing?.image_urls)) {
    listing.image_urls = [];
  }
  if (errors.length > 0) {
    Sentry.captureMessage('Invalid catch_log data', { extra: { listing, errors } });
  }
  return errors.length > 0 ? errors : null;
};

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [listings, setListings] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        if (isOnline) {
          // Fetch all catch logs
          const { data: logsData, error: logsError } = await supabase
            .from('catch_logs')
            .select('*')
            .order('created_at', { ascending: false });
          if (logsError) throw logsError;

          const validListings = logsData.filter((listing) => !validateListing(listing));
          if (validListings.length < logsData.length) {
            setError(t('dashboard.errors.invalidData'));
          }
          setListings(validListings);

          // Fetch all users
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, email, role');
          if (usersError) throw usersError;
          setUsers(usersData);
        } else {
          setError(t('dashboard.errors.offline'));
        }
      } catch (error) {
        Sentry.captureException(error);
        setError(error.message || t('dashboard.errors.generic'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase, isOnline, navigate, t]);

  const handleApproveListing = async (batchId) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('catch_logs')
          .update({ status: 'approved' })
          .eq('batch_id', batchId);
        if (error) throw error;
        setListings(listings.map((listing) =>
          listing.batch_id === batchId ? { ...listing, status: 'approved' } : listing
        ));
      } else {
        setError(t('dashboard.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('dashboard.errors.generic'));
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', userId);
        if (error) throw error;
        setUsers(users.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        ));
      } else {
        setError(t('dashboard.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('dashboard.errors.generic'));
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <DashboardWrapper theme={theme}>
      <DashboardCard theme={theme}>
        <h2>{t('dashboard.title')}</h2>
        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        {loading && <p>{t('dashboard.loading')}</p>}

        <h3>{t('dashboard.catchLogs')}</h3>
        <Table>
          <thead>
            <tr>
              <Th>{t('dashboard.batchId')}</Th>
              <Th>{t('dashboard.species')}</Th>
              <Th>{t('dashboard.weight')}</Th>
              <Th>{t('dashboard.price')}</Th>
              <Th>{t('dashboard.status')}</Th>
              <Th>{t('dashboard.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.batch_id}>
                <Td>{listing.batch_id}</Td>
                <Td>{listing.species}</Td>
                <Td>{listing.weight}</Td>
                <Td>{listing.price}</Td>
                <Td>{listing.status || 'pending'}</Td>
                <Td>
                  {listing.status !== 'approved' && (
                    <Button
                      onClick={() => handleApproveListing(listing.batch_id)}
                      disabled={loading}
                    >
                      {t('dashboard.approve')}
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <h3>{t('dashboard.users')}</h3>
        <Table>
          <thead>
            <tr>
              <Th>{t('dashboard.userId')}</Th>
              <Th>{t('dashboard.email')}</Th>
              <Th>{t('dashboard.role')}</Th>
              <Th>{t('dashboard.actions')}</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>{u.id}</Td>
                <Td>{u.email}</Td>
                <Td>{u.role}</Td>
                <Td>
                  <Button
                    onClick={() => handleUpdateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                    disabled={loading}
                  >
                    {t('dashboard.toggleRole')}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </DashboardCard>
    </DashboardWrapper>
  );
};

export default Dashboard;