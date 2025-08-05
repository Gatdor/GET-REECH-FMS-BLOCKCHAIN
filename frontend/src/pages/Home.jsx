import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  faUsers,
  faFish,
  faShoppingCart,
  faSignOutAlt,
  faBars,
  faMoon,
  faSun,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Tilt from 'react-parallax-tilt';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { Helmet } from 'react-helmet-async';

// Constants
const customIcon = new L.Icon({
  iconUrl: './assets/fallback-fish.jpg' || 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const animationVariants = {
  page: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
    transition: { duration: 0.5 },
  },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  slide: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { duration: 0.5 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.8 },
  },
};

const sidebarLinks = [
  { to: '/', icon: faUsers, label: 'Home' },
  { to: '/dashboard', icon: faFish, label: 'Dashboard', role: 'admin' },
  { to: '/log-catch', icon: faFish, label: 'Log Catch', role: 'fisherman' },
  { to: '/admin/users', icon: faUsers, label: 'Manage Users', role: 'admin' },
  { to: '/admin/catch-logs', icon: faFish, label: 'Catch Logs', role: 'admin' },
  { to: '/market', icon: faShoppingCart, label: 'Market' },
  { to: '/profile', icon: faUsers, label: 'Profile' },
];

// Shared Styles
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
const HomeContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  font-family: 'Roboto', sans-serif;
  overflow-x: hidden;
`;

const Sidebar = styled(motion.aside)`
  width: 250px;
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.primary || '#1E3A8A'} 0%,
    #2B4C7E 100%
  );
  color: white;
  padding: clamp(1rem, 2vw, 1.5rem);
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  ${commonStyles}
  @media (max-width: 768px) {
    width: 100%;
    position: fixed;
    z-index: 1000;
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    transition: transform 0.3s ease;
  }
`;

const StyledLink = styled(motion.create(Link))`
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  font-size: ${clampFontSize(0.9, 2, 1)};
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(5px);
  }
`;

const IconButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  font-size: ${clampFontSize(1, 2.5, 1.2)};
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const MainContent = styled.main`
  flex: 1;
  padding: clamp(1rem, 3vw, 2rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem);
  ${commonStyles}
  width: 100%;
  max-width: 1200px;
  margin-bottom: clamp(1rem, 3vw, 2rem);
`;

const Title = styled.h1`
  font-size: ${clampFontSize(1.2, 3, 1.5)};
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0;
`;

const HeroSection = styled(motion.section)`
  text-align: center;
  padding: clamp(3rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem);
  max-width: 1200px;
  width: 100%;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.primary || '#3B82F6'} 0%,
    ${({ theme }) => theme.primaryHover || '#1E3A8A'} 100%
  );
  color: white;
  ${commonStyles}
  margin-bottom: clamp(1.5rem, 3vw, 2rem);
  position: relative;
  overflow: hidden;
`;

const HeroOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('/assets/hero-bg.jpg') center/cover;
  opacity: 0.15;
  z-index: 0;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
`;

const HeroTitle = styled.h1`
  font-size: ${clampFontSize(2, 5, 3)};
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const HeroSubtitle = styled.p`
  font-size: ${clampFontSize(1, 2.5, 1.3)};
  margin-bottom: clamp(1rem, 2vw, 1.5rem);
  opacity: 0.9;
`;

const Button = styled(motion.button)`
  ${GradientButton}
`;

const StatsSection = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
  width: 100%;
  max-width: 1200px;
  margin: clamp(1.5rem, 3vw, 2rem) 0;
`;

const StatCard = ({ value, label, delay, format }) => (
  <StatCardStyled
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <StatNumber
      initial={{ number: 0 }}
      animate={{ number: value }}
      transition={{ duration: 2 }}
      custom={{ format: format || Math.round }}
    >
      {format ? format(value) : Math.round(value)}
    </StatNumber>
    <StatLabel>{label}</StatLabel>
  </StatCardStyled>
);

const StatCardStyled = styled(motion.div)`
  background: white;
  padding: clamp(1rem, 2vw, 1.5rem);
  text-align: center;
  ${commonStyles}
`;

const StatNumber = styled(motion.h3)`
  font-size: ${clampFontSize(1.5, 3, 2)};
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  margin: 0;
`;

const StatLabel = styled.p`
  font-size: ${clampFontSize(0.9, 2, 1)};
  color: ${({ theme }) => theme.textSecondary || '#6B7280'};
`;

const ListingCard = ({ listing, t }) => (
  <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10}>
    <ListingCardStyled
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ListingImage
        src={listing.image_urls?.[0]?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || '/assets/fallback-fish.jpg'}
        alt={t('imageAlt', { species: listing.species })}
        effect="blur"
      />
      <ListingContent>
        <ListingTitle>
          {t('ListingTitle', { species: listing.species, batchId: listing.batch_id })}
        </ListingTitle>
        <ListingDetail>{t('weight', { weight: listing.weight })}</ListingDetail>
        <ListingDetail>{t('price', { price: listing.price })}</ListingDetail>
        <ListingDetail>
          {t('qualityScore', { score: (listing.quality_score * 100).toFixed(2) })}
        </ListingDetail>
      </ListingContent>
    </ListingCardStyled>
  </Tilt>
);

const ListingCardStyled = styled(motion.div)`
  background: white;
  ${commonStyles}
  transition: transform 0.3s;
`;

const ListingImage = styled(LazyLoadImage)`
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
`;

const ListingContent = styled.div`
  padding: clamp(0.75rem, 2vw, 1rem);
`;

const ListingTitle = styled.h3`
  font-size: ${clampFontSize(1, 2.5, 1.25)};
  color: ${({ theme }) => theme.text || '#1F2937'};
  margin: 0 0 0.5rem;
  font-weight: 600;
`;

const ListingDetail = styled.p`
  font-size: ${clampFontSize(0.85, 2, 0.95)};
  color: ${({ theme }) => theme.textSecondary || '#6B7280'};
  margin: 0.25rem 0;
`;

const CarouselSection = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: clamp(1.5rem, 3vw, 2rem) 0;
  position: relative;
`;

const CarouselWrapper = styled(motion.div)`
  display: flex;
  overflow: hidden;
  ${commonStyles}
`;

const CarouselItem = styled(motion.div)`
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  padding: clamp(1rem, 2vw, 1.5rem);
`;

const CarouselImage = styled(LazyLoadImage)`
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 8px;
`;

const CarouselNav = styled(IconButton)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 0.5rem;
  border-radius: 50%;
  font-size: ${clampFontSize(1, 2, 1.2)};
  ${({ direction }) => (direction === 'left' ? 'left: 1rem;' : 'right: 1rem;')}
`;

const MapSection = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: clamp(1.5rem, 3vw, 2rem) 0;
  height: 400px;
  ${commonStyles}
`;

const ListingsSection = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
  width: 100%;
  max-width: 1200px;
  margin: clamp(1.5rem, 3vw, 2rem) 0;
`;

const NewsletterSection = styled.section`
  width: 100%;
  max-width: 600px;
  margin: clamp(1.5rem, 3vw, 2rem) 0;
  text-align: center;
`;

const NewsletterForm = styled.form`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const NewsletterInput = styled.input`
  flex: 1;
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  border: 1px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-radius: 8px;
  font-size: ${clampFontSize(0.9, 2, 1)};
`;

const ErrorMessage = styled(motion.p)`
  color: #EF4444;
  font-size: ${clampFontSize(0.8, 2, 0.875)};
  text-align: center;
  padding: 0.5rem;
  background: #FEE2E2;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const LoadingSpinner = styled(motion.div)`
  border: 4px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-top: 4px solid ${({ theme }) => theme.primary || '#3B82F6'};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: clamp(1.5rem, 3vw, 2rem);
  background: white;
  ${commonStyles}
  max-width: 600px;
  width: 100%;
  margin: 2rem auto;
`;

const Footer = styled.footer`
  margin-top: clamp(2rem, 4vw, 3rem);
  padding: clamp(1.5rem, 3vw, 2rem);
  background: white;
  width: 100%;
  text-align: center;
  ${commonStyles}
`;

// Validation
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
  const { user, supabase, isOnline, logout } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [state, setState] = useState({
    listings: [],
    error: '',
    loading: false,
    isSidebarOpen: false,
    carouselIndex: 0,
    stats: { catches: 0, users: 0, value: 0 },
    email: '',
  });

  const { listings, error, loading, isSidebarOpen, carouselIndex, stats, email } = state;

  // Log user phone
  useEffect(() => {
    console.log('[Home] User Phone:', user?.user_metadata?.phone);
  }, [user]);

  // Fetch Listings and Stats
  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      if (!isOnline) {
        throw new Error(t('home.errors.offline'));
      }

      let query = supabase
        .from('catch_logs')
        .select('batch_id, species, weight, price, quality_score, image_urls, user_id, status, latitude, longitude')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(12);
      if (user && user.user_metadata?.role === 'fisherman') {
        query = query.eq('user_id', user.id);
      }
      const { data: listingsData, error: listingsError } = await query;
      if (listingsError) throw listingsError;

      const validListings = listingsData.filter((listing) => !validateListing(listing));
      if (validListings.length < listingsData.length) {
        setState((prev) => ({ ...prev, error: t('home.errors.invalidData') }));
      }

      const [{ count: catches }, { count: users }, { data: valueData }] = await Promise.all([
        supabase.from('catch_logs').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('catch_logs').select('price').eq('status', 'approved'),
      ]);
      const totalValue = valueData.reduce((sum, item) => sum + item.price, 0);

      setState((prev) => ({
        ...prev,
        listings: validListings,
        stats: { catches: catches || 0, users: users || 0, value: totalValue || 0 },
      }));
    } catch (error) {
      console.error('[Home] Fetch error:', error);
      Sentry.captureException(error);
      setState((prev) => ({ ...prev, error: error.message || t('home.errors.generic') }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [supabase, isOnline, user, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Carousel Auto-Rotation
  useEffect(() => {
    if (listings.length === 0) return;
    const interval = setInterval(() => {
      setState((prev) => ({
        ...prev,
        carouselIndex: (prev.carouselIndex + 1) % prev.listings.length,
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [listings.length]);

  // Newsletter Signup
  const handleNewsletterSignup = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        if (!isOnline) {
          throw new Error(t('home.errors.offline'));
        }
        const { error } = await supabase.from('newsletter_subscribers').insert({ email });
        if (error) throw error;
        setState((prev) => ({ ...prev, email: '', error: t('home.newsletter.success') }));
      } catch (error) {
        console.error('[Home] Newsletter signup error:', error);
        Sentry.captureException(error);
        setState((prev) => ({ ...prev, error: t('home.newsletter.error') }));
      }
    },
    [supabase, isOnline, email, t]
  );

  const featuredListings = useMemo(() => listings.slice(0, 3), [listings]);

  return (
    <AnimatePresence>
      <motion.div {...animationVariants.page}>
        <Helmet>
          <title>{t('home.title')} | Fisheries Management System</title>
          <meta name="description" content={t('home.subtitle')} />
          <meta name="keywords" content="fisheries, catch management, blockchain, marketplace" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta property="og:title" content={t('home.title')} />
          <meta property="og:description" content={t('home.subtitle')} />
          <meta property="og:image" content="/assets/hero-bg.jpg" />
        </Helmet>
        <HomeContainer theme={theme}>
          <Sidebar
            initial={{ x: -250 }}
            animate={{ x: isSidebarOpen ? 0 : -250 }}
            transition={{ duration: 0.3 }}
            isOpen={isSidebarOpen}
          >
            <motion.h2 whileHover={animationVariants.hover} style={{ marginBottom: '1rem', fontSize: clampFontSize(1.2, 3, 1.5) }}>
              {t('Admin Dashboard')}
            </motion.h2>
            {sidebarLinks
              .filter((link) => !link.role || (user && user.user_metadata?.role === link.role))
              .map((link) => (
                <StyledLink
                  key={link.to}
                  to={link.to}
                  whileHover={animationVariants.hover}
                  onClick={() => setState((prev) => ({ ...prev, isSidebarOpen: false }))}
                >
                  <FontAwesomeIcon icon={link.icon} /> {t(link.label)}
                </StyledLink>
              ))}
            {user && (
              <StyledLink
                as="button"
                whileHover={animationVariants.hover}
                onClick={() => {
                  logout();
                  navigate('/login');
                  setState((prev) => ({ ...prev, isSidebarOpen: false }));
                }}
              >
                <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
              </StyledLink>
            )}
          </Sidebar>
          <MainContent>
            <Header>
              <IconButton
                whileHover={animationVariants.hover}
                whileTap={animationVariants.tap}
                onClick={() => setState((prev) => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }))}
                aria-label={t('Toggle Sidebar')}
                style={{ display: 'none', '@media (max-width: 768px)': { display: 'block' } }}
              >
                <FontAwesomeIcon icon={faBars} />
              </IconButton>
              <Title>{t('home.title', 'GETREECH')}</Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: clampFontSize(0.5, 2, 1), fontSize: clampFontSize(0.8, 2, 1) }}>
                {user && (
                  <>
                    {user.user_metadata?.name} ({t(`register.roles.${user.user_metadata?.role}`)})
                    <IconButton
                      whileHover={animationVariants.hover}
                      whileTap={animationVariants.tap}
                      onClick={toggleTheme}
                      aria-label={t(theme.mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode')}
                    >
                      <FontAwesomeIcon icon={theme.mode === 'light' ? faMoon : faSun} />
                    </IconButton>
                    <IconButton
                      whileHover={animationVariants.hover}
                      whileTap={animationVariants.tap}
                      onClick={logout}
                      aria-label={t('Logout')}
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} />
                    </IconButton>
                  </>
                )}
              </div>
            </Header>
            <HeroSection {...animationVariants.fade}>
              <HeroOverlay initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 1 }} />
              <HeroContent>
                <HeroTitle>{t('home.title', 'GETREECH')}</HeroTitle>
                <HeroSubtitle>{t('home.subtitle', 'Empowering Fishermen with Blockchain-Powered Transparency')}</HeroSubtitle>
                <div>
                  {!user ? (
                    <>
                      <Button
                        whileHover={animationVariants.hover}
                        whileTap={animationVariants.tap}
                        onClick={() => navigate('/register')}
                        aria-label={t('Register')}
                      >
                        {t('Register')}
                      </Button>
                      <Button
                        whileHover={animationVariants.hover}
                        whileTap={animationVariants.tap}
                        onClick={() => navigate('/login')}
                        aria-label={t('Login')}
                      >
                        {t('Login')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        whileHover={animationVariants.hover}
                        whileTap={animationVariants.tap}
                        onClick={() => navigate(user.user_metadata?.role === 'admin' ? '/dashboard' : '/log-catch')}
                        aria-label={t(user.user_metadata?.role === 'admin' ? 'dashboard' : 'logCatch')}
                      >
                        {t(user.user_metadata?.role === 'admin' ? 'dashboard' : 'logCatch')}
                      </Button>
                      <Button
                        whileHover={animationVariants.hover}
                        whileTap={animationVariants.tap}
                        onClick={() => navigate('/market')}
                        aria-label={t('ExploreMarket')}
                      >
                        {t('ExploreMarket')}
                      </Button>
                    </>
                  )}
                </div>
              </HeroContent>
            </HeroSection>
            {featuredListings.length > 0 && (
              <CarouselSection>
                <CarouselWrapper>
                  <AnimatePresence>
                    <CarouselItem
                      key={carouselIndex}
                      {...animationVariants.slide}
                    >
                      <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10}>
                        <div style={{ textAlign: 'center' }}>
                          <CarouselImage
                            src={featuredListings[carouselIndex]?.image_urls?.[0]?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || '/assets/fallback-fish.jpg'}
                            alt={t('imageAlt', { species: featuredListings[carouselIndex]?.species })}
                            effect="blur"
                          />
                          <ListingTitle>{t('ListingTitle', { species: featuredListings[carouselIndex]?.species, batchId: featuredListings[carouselIndex]?.batch_id })}</ListingTitle>
                          <ListingDetail>{t('price', { price: featuredListings[carouselIndex]?.price })}</ListingDetail>
                        </div>
                      </Tilt>
                    </CarouselItem>
                  </AnimatePresence>
                </CarouselWrapper>
                <CarouselNav
                  direction="left"
                  whileHover={animationVariants.hover}
                  whileTap={animationVariants.tap}
                  onClick={() => setState((prev) => ({ ...prev, carouselIndex: (prev.carouselIndex - 1 + featuredListings.length) % featuredListings.length }))}
                  aria-label={t('Previous slide')}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </CarouselNav>
                <CarouselNav
                  direction="right"
                  whileHover={animationVariants.hover}
                  whileTap={animationVariants.tap}
                  onClick={() => setState((prev) => ({ ...prev, carouselIndex: (prev.carouselIndex + 1) % featuredListings.length }))}
                  aria-label={t('Next slide')}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </CarouselNav>
              </CarouselSection>
            )}
            <StatsSection>
              {[
                { value: stats.catches, label: t('Total Catches'), delay: 0 },
                { value: stats.users, label: t('Registered Users'), delay: 0.2 },
                { value: stats.value, label: t('Market Value'), delay: 0.4, format: (value) => `KES ${Math.round(value).toLocaleString()}` },
              ].map((stat) => (
                <StatCard
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                  delay={stat.delay}
                  format={stat.format}
                />
              ))}
            </StatsSection>
            {listings.some((l) => l.latitude && l.longitude) && (
              <MapSection>
                <MapContainer
                  center={[-4.0435, 39.6682]}
                  zoom={10}
                  style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {listings
                    .filter((l) => l.latitude && l.longitude)
                    .map((listing) => (
                      <Marker
                        key={listing.batch_id}
                        position={[listing.latitude, listing.longitude]}
                        icon={customIcon}
                      >
                        <Popup>
                          {t('ListingTitle', { species: listing.species, batchId: listing.batch_id })}
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </MapSection>
            )}
            <ListingsSection>
              <h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem' }}>
                {t('RecentListings')}
              </h2>
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
                    <Button
                      whileHover={animationVariants.hover}
                      whileTap={animationVariants.tap}
                      onClick={fetchData}
                      style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
                    >
                      {t('Retry')}
                    </Button>
                  </ErrorMessage>
                )}
              </AnimatePresence>
              {loading && <LoadingSpinner />}
              {!loading && listings.length === 0 && (
                <EmptyState>
                  <p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary || '#6B7280' }}>
                    {t('home.noListings')}
                  </p>
                </EmptyState>
              )}
              {!loading && listings.length > 0 && (
                <ListingsGrid>
                  {listings.map((listing) => (
                    <ListingCard key={listing.batch_id} listing={listing} t={t} />
                  ))}
                </ListingsGrid>
              )}
            </ListingsSection>
            <NewsletterSection>
              <h2 style={{ fontSize: clampFontSize(1.2, 3, 1.5), marginBottom: '1rem' }}>
                {t('home.newsletter.title')}
              </h2>
              <p style={{ fontSize: clampFontSize(0.9, 2, 1), color: theme.textSecondary || '#6B7280' }}>
                {t('home.newsletter.subtitle')}
              </p>
              <NewsletterForm onSubmit={handleNewsletterSignup}>
                <NewsletterInput
                  type="email"
                  placeholder={t('home.newsletter.placeholder')}
                  value={email}
                  onChange={(e) => setState((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  aria-label={t('home.newsletter.placeholder')}
                />
                <Button
                  whileHover={animationVariants.hover}
                  whileTap={animationVariants.tap}
                  type="submit"
                  aria-label={t('home.newsletter.submit')}
                >
                  {t('home.newsletter.submit')}
                </Button>
              </NewsletterForm>
            </NewsletterSection>
            <Footer>
              <motion.div {...animationVariants.fade}>
                <Link to="/about" style={{ color: theme.primary || '#3B82F6', margin: '0 1rem', textDecoration: 'none' }}>
                  {t('about')}
                </Link>
                <Link to="/privacy" style={{ color: theme.primary || '#3B82F6', margin: '0 1rem', textDecoration: 'none' }}>
                  {t('privacy')}
                </Link>
                <p style={{ fontSize: clampFontSize(0.8, 2, 0.9), color: theme.textSecondary || '#6B7280', marginTop: '1rem' }}>
                  &copy; {new Date().getFullYear()} GETREECH. All rights reserved.
                </p>
              </motion.div>
            </Footer>
          </MainContent>
        </HomeContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default Home;