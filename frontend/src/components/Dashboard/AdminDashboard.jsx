// frontend/src/components/Dashboard/AdminDashboard.jsx
import React, { memo, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ErrorBoundary } from 'react-error-boundary';
import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';  

const DashboardWrapper = styled(animated.div)`
  padding: 1.5rem;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
`;

const DashboardCard = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.card};
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const DashboardTile = styled.div`
  background: ${({ theme }) => theme.colors.tileBackground};
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const TileIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const TileTitle = styled.h3`
  margin: 0.5rem 0;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.text};
`;

const TileDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ErrorFallback = ({ error }) => {
  const { t } = useTranslation();
  return (
    <div role="alert" className="error-fallback">
      <h2>{t('error.title')}</h2>
      <p>{error.message}</p>
    </div>
  );
};

const AdminDashboard = ({ theme = 'light' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnline } = useContext(AuthContext);
  const fade = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    config: { duration: 500 },
  });

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      const { data: catchData } = await supabase.from('catch_logs').select('count', { count: 'exact' }).eq('user_id', user.id);
      const { data: marketData } = await supabase.from('market_listings').select('count', { count: 'exact' }).eq('user_id', user.id);
      const { data: inventoryData } = await supabase.from('inventory').select('count', { count: 'exact' }).eq('user_id', user.id);
      return {
        catchEntries: { count: catchData.count },
        marketListings: { count: marketData.count, active: marketData.count },
        inventory: { items: inventoryData.count },
        analytics: { reports: 0 }, // Placeholder for analytics
      };
    },
    enabled: !!user && isOnline,
    staleTime: 5 * 60 * 1000,
  });

  const tiles = [
    {
      title: t('dashboard.tiles.catchEntry.title'),
      description: t('dashboard.tiles.catchEntry.description'),
      icon: '🎣',
      path: '/log-catch',
      count: dashboardData?.catchEntries?.count || 0,
    },
    {
      title: t('dashboard.tiles.marketplace.title'),
      description: t('dashboard.tiles.marketplace.description'),
      icon: '🛒',
      path: '/market',
      count: dashboardData?.marketListings?.count || 0,
    },
    {
      title: t('dashboard.tiles.analytics.title'),
      description: t('dashboard.tiles.analytics.description'),
      icon: '📈',
      path: '/analytics',
      count: dashboardData?.analytics?.reports || 0,
    },
    {
      title: t('dashboard.tiles.settings.title'),
      description: t('dashboard.tiles.settings.description'),
      icon: '⚙️',
      path: '/settings',
    },
    {
      title: t('dashboard.tiles.inventory.title'),
      description: t('dashboard.tiles.inventory.description'),
      icon: '📦',
      path: '/inventory',
      count: dashboardData?.inventory?.items || 0,
    },
    {
      title: t('dashboard.tiles.marketListings.title'),
      description: t('dashboard.tiles.marketListings.description'),
      icon: '📋',
      path: '/market-listings',
      count: dashboardData?.marketListings?.active || 0,
    },
    {
      title: t('dashboard.tiles.support.title'),
      description: t('dashboard.tiles.support.description'),
      icon: '🆘',
      path: '/feedback',
    },
  ];

  const handleTileClick = useCallback(
    (path) => {
      if (!isOnline && path !== '/settings' && path !== '/feedback') {
        alert(t('dashboard.offlineWarning'));
      } else {
        navigate(path);
      }
    },
    [navigate, isOnline, t]
  );

  if (isLoading) return <div>{t('dashboard.loading')}</div>;
  if (error) return <ErrorFallback error={error} />;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DashboardWrapper style={fade} data-testid="dashboard-wrapper" theme={theme}>
        <DashboardCard theme={theme}>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.welcome')}</p>
          {isOnline && (
            <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
              {t('dashboard.offlineMode')}
            </div>
          )}
          <DashboardGrid>
            {tiles.map((tile, index) => (
              <DashboardTile
                key={`${tile.title}-${index}`}
                onClick={() => handleTileClick(tile.path)}
                tabIndex={0}
                role="button"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleTileClick(tile.path);
                  }
                }}
                aria-label={`${tile.title}: ${tile.description}`}
                theme={theme}
              >
                <TileIcon>{tile.icon}</TileIcon>
                <TileTitle>
                  {tile.title} {tile.count ? `(${tile.count})` : ''}
                </TileTitle>
                <TileDescription>{tile.description}</TileDescription>
              </DashboardTile>
            ))}
          </DashboardGrid>
        </DashboardCard>
      </DashboardWrapper>
    </ErrorBoundary>
  );
};

AdminDashboard.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']),
};

AdminDashboard.defaultProps = {
  theme: 'light',
};

export default memo(AdminDashboard);