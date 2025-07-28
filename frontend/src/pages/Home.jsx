import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

const HomeWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background || '#f9fafb'};
  padding: 2rem;
`;

const HeroSection = styled.section`
  text-align: center;
  padding: 3rem 1rem;
  max-width: 800px;
  width: 100%;
`;

const HeroTitle = styled.h1`
  font-size: 2.5rem;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin-bottom: 1rem;
`;

const HeroSubtitle = styled.p`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.textSecondary || '#6b7280'};
  margin-bottom: 2rem;
`;

const WelcomeMessage = styled.p`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin-bottom: 1.5rem;
`;

const Button = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.primary || '#1e40af'};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin: 0.5rem;
  &:hover {
    background: ${({ theme }) => theme.primaryHover || '#1e3a8a'};
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6b7280'};
    cursor: not-allowed;
  }
`;

const ListingsSection = styled.section`
  width: 100%;
  max-width: 800px;
  margin-top: 2rem;
`;

const ListingCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
`;

const ListingImage = styled.img`
  max-width: 100%;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const ListingTitle = styled.h3`
  font-size: 1.25rem;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin: 0 0 0.5rem;
`;

const ListingDetail = styled.p`
  color: ${({ theme }) => theme.textSecondary || '#6b7280'};
  margin: 0.25rem 0;
`;

const ErrorMessage = styled.p`
  color: red;
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
`;

const Footer = styled.footer`
  margin-top: 3rem;
  padding: 2rem;
  background: ${({ theme }) => theme.card || '#ffffff'};
  width: 100%;
  text-align: center;
`;

const FooterLink = styled.a`
  color: ${({ theme }) => theme.primary || '#1e40af'};
  margin: 0 1rem;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
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

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError('');
      try {
        if (isOnline && user) {
          let query = supabase
            .from('catch_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);

          if (user.role === 'fisherman') {
            query = query.eq('user_id', user.id);
          }

          const { data, error: dbError } = await query;
          if (dbError) throw dbError;

          const validListings = data.filter((listing) => !validateListing(listing));
          if (validListings.length < data.length) {
            setError(t('home.errors.invalidData'));
          }
          setListings(validListings);
        } else if (!user) {
          setError(t('home.errors.unauthenticated'));
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
  }, [supabase, isOnline, user, t]);

  return (
    <HomeWrapper theme={theme}>
      <HeroSection theme={theme}>
        <HeroTitle>{t('home.title', 'GETREECH')}</HeroTitle>
        <HeroSubtitle>{t('home.subtitle')}</HeroSubtitle>
        {user && (
          <WelcomeMessage>
            {t('welcome', { role: t(`register.roles.${user.role}`) })}
          </WelcomeMessage>
        )}
        <div>
          {!user ? (
            <>
              <Button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/register')}
                data-tooltip-id="register-tip"
                data-tooltip-content={t('register')}
              >
                {t('Register')}
              </Button>
              <Button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                data-tooltip-id="login-tip"
                data-tooltip-content={t('login')}
              >
                {t('Login')}
              </Button>
              <Tooltip id="register-tip" />
              <Tooltip id="login-tip" />
            </>
          ) : (
            <>
              <Button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(user.role === 'admin' ? '/dashboard' : '/log-catch')}
                data-tooltip-id="action-tip"
                data-tooltip-content={t(
                  user.role === 'admin' ? 'dashboard' : 'logCatch'
                )}
              >
                {t(user.role === 'admin' ? 'dashboard' : 'logCatch')}
              </Button>
              <Button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/market')}
                data-tooltip-id="market-tip"
                data-tooltip-content={t('tooltips.market')}
              >
                {t('ExploreMarket')}
              </Button>
              <Tooltip id="action-tip" />
              <Tooltip id="market-tip" />
            </>
          )}
        </div>
      </HeroSection>

      {user && (
        <ListingsSection>
          <h2>{t('RecentListings')}</h2>
          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
          {loading && <p>{t('loading')}</p>}
          {listings.map((listing) => (
            <ListingCard
              key={listing.batch_id}
              theme={theme}
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
            </ListingCard>
          ))}
        </ListingsSection>
      )}

      <Footer theme={theme}>
        <FooterLink href="/about">{t('about')}</FooterLink>
        <FooterLink href="/privacy">{t('privacy')}</FooterLink>
      </Footer>
    </HomeWrapper>
  );
};

export default Home;