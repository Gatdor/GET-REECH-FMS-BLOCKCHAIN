import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faFish,
  faShoppingCart,
  faSignOutAlt,
  faBars,
  faSearch,
  faCheck,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

// Reuse styled components from Home.jsx and AdminCatchLogs.jsx
const MarketContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  font-family: 'Roboto', sans-serif;
  overflow-x: hidden;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: clamp(1rem, 3vw, 1.5rem);
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 100%;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  flex: 1;
  font-size: clamp(0.9rem, 2vw, 1rem);
`;

const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
  width: 100%;
  max-width: 1200px;
`;

const ActionButton = styled(motion.button)`
  padding: 0.5rem 1rem;
  background: ${({ theme, reject }) => (reject ? '#EF4444' : theme.primary || '#3B82F6')};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
  font-size: clamp(0.8rem, 2vw, 0.9rem);
  &:hover {
    background: ${({ theme, reject }) => (reject ? '#DC2626' : theme.primaryHover || '#2563EB')};
  }
`;

const Market = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline, logout } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError('');
      try {
        if (isOnline) {
          const { data, error: dbError } = await supabase
            .from('catch_logs')
            .select('batch_id, species, weight, price, quality_score, image_urls, user_id, status')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(12);
          if (dbError) throw dbError;
          setListings(data.filter((listing) => !validateListing(listing)));
        } else {
          setError(t('home.errors.offline'));
        }
      } catch (error) {
        Sentry.captureException(error);
        setError(error.message || t('home.errors.generic'));
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [supabase, isOnline, t]);

  const filteredListings = listings.filter(
    (listing) =>
      listing.species.toLowerCase().includes(search.toLowerCase()) ||
      listing.batch_id.toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = async (batchId) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('catch_logs')
          .update({ status: 'approved' })
          .eq('batch_id', batchId);
        if (error) throw error;
        setListings(listings.map((l) => (l.batch_id === batchId ? { ...l, status: 'approved' } : l)));
      } else {
        setError(t('home.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('home.errors.generic'));
    }
  };

  const handleReject = async (batchId) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('catch_logs')
          .update({ status: 'rejected' })
          .eq('batch_id', batchId);
        if (error) throw error;
        setListings(listings.map((l) => (l.batch_id === batchId ? { ...l, status: 'rejected' } : l)));
      } else {
        setError(t('home.errors.offline'));
      }
    } catch (error) {
      Sentry.captureException(error);
      setError(t('home.errors.generic'));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3 }}
      >
        <MarketContainer theme={theme}>
          <Sidebar
            initial={{ x: -250 }}
            animate={{ x: isSidebarOpen ? 0 : -250 }}
            transition={{ duration: 0.3 }}
            isOpen={isSidebarOpen}
          >
            <motion.h2
              whileHover={{ scale: 1.05 }}
              style={{ marginBottom: '1rem', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}
            >
              {t('Admin Dashboard')}
            </motion.h2>
            <SidebarLink as={Link} to="/" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faUsers} /> {t('Home')}
            </SidebarLink>
            {user && (
              <>
                <SidebarLink
                  as={Link}
                  to={user.user_metadata?.role === 'admin' ? '/dashboard' : '/log-catch'}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FontAwesomeIcon icon={faFish} /> {t(user.user_metadata?.role === 'admin' ? 'Dashboard' : 'Log Catch')}
                </SidebarLink>
                <SidebarLink
                  as={Link}
                  to="/admin/users"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FontAwesomeIcon icon={faUsers} /> {t('Manage Users')}
                </SidebarLink>
                <SidebarLink
                  as={Link}
                  to="/admin/catch-logs"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FontAwesomeIcon icon={faFish} /> {t('Catch Logs')}
                </SidebarLink>
                <SidebarLink
                  as={Link}
                  to="/admin/market"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FontAwesomeIcon icon={faShoppingCart} /> {t('Market')}
                </SidebarLink>
                <SidebarLink
                  as={Link}
                  to="/profile"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FontAwesomeIcon icon={faUsers} /> {t('Profile')}
                </SidebarLink>
                <SidebarLink
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    logout();
                    navigate('/login');
                    setIsSidebarOpen(false);
                  }}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
                </SidebarLink>
              </>
            )}
          </Sidebar>
          <MainContent>
            <Header>
              <MenuButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={t('Toggle Sidebar')}
              >
                <FontAwesomeIcon icon={faBars} />
              </MenuButton>
              <Title>{t('Market')}</Title>
              {user && (
                <UserInfo>
                  {user.user_metadata?.name} ({t(`register.roles.${user.user_metadata?.role}`)})
                  <LogoutButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => logout()}
                    aria-label={t('Logout')}
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
                  </LogoutButton>
                </UserInfo>
              )}
            </Header>
            <SearchBar>
              <FontAwesomeIcon icon={faSearch} />
              <SearchInput
                type="text"
                placeholder={t('Search listings...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('Search listings')}
              />
            </SearchBar>
            <AnimatePresence>
              {error && (
                <ErrorMessage
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </ErrorMessage>
              )}
            </AnimatePresence>
            {loading && <LoadingSpinner />}
            {!loading && filteredListings.length === 0 && (
              <EmptyState>
                <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: theme.textSecondary || '#6B7280' }}>
                  {t('market.noListings')}
                </p>
              </EmptyState>
            )}
            {!loading && filteredListings.length > 0 && (
              <ListingsGrid>
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.batch_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ListingTitle>
                      {t('ListingTitle', { species: listing.species, batchId: listing.batch_id })}
                    </ListingTitle>
                    {listing.image_urls && listing.image_urls[0] ? (
                      <ListingImage
                        src={listing.image_urls[0].replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                        alt={t('imageAlt', { species: listing.species })}
                        onError={(e) => (e.target.src = '/assets/fallback-fish.jpg')}
                      />
                    ) : (
                      <ListingImage
                        src="/assets/fallback-fish.jpg"
                        alt={t('imageAlt', { species: listing.species })}
                      />
                    )}
                    <ListingDetail>{t('weight', { weight: listing.weight })}</ListingDetail>
                    <ListingDetail>{t('price', { price: listing.price })}</ListingDetail>
                    <ListingDetail>
                      {t('qualityScore', { score: (listing.quality_score * 100).toFixed(2) })}
                    </ListingDetail>
                    {user?.user_metadata?.role === 'admin' && listing.status !== 'approved' && (
                      <div style={{ marginTop: '1rem' }}>
                        <ActionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(listing.batch_id)}
                          aria-label={t('Approve listing')}
                        >
                          <FontAwesomeIcon icon={faCheck} /> {t('Approve')}
                        </ActionButton>
                        <ActionButton
                          reject
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReject(listing.batch_id)}
                          aria-label={t('Reject listing')}
                        >
                          <FontAwesomeIcon icon={faTimes} /> {t('Reject')}
                        </ActionButton>
                      </div>
                    )}
                  </ListingCard>
                ))}
              </ListingsGrid>
            )}
          </MainContent>
        </MarketContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default Market;