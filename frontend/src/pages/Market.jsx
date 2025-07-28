import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Sentry from '@sentry/react';

const MarketWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background || '#f9fafb'};
  padding: 2rem;
`;

const ListingCard = styled.div`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
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

const Market = () => {
  const { t } = useTranslation();
  const { supabase, isOnline } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      setError('');

      try {
        if (isOnline) {
          const { data, error: dbError } = await supabase
            .from('catch_logs')
            .select('*')
            .order('created_at', { ascending: false });
          if (dbError) throw dbError;

          const validListings = data.filter((listing) => !validateListing(listing));
          if (validListings.length < data.length) {
            setError(t('market.errors.invalidData'));
          }
          setListings(validListings);
        } else {
          setError(t('market.errors.offline'));
        }
      } catch (error) {
        Sentry.captureException(error);
        setError(error.message || t('market.errors.generic'));
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [supabase, isOnline, t]);

  return (
    <MarketWrapper theme={theme}>
      <h2>{t('market.title')}</h2>
      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
      {loading && <p>{t('market.loading')}</p>}
      {listings.map((listing) => (
        <ListingCard key={listing.batch_id} theme={theme}>
          <ListingTitle>
            {t('market.listingTitle', { species: listing.species, batchId: listing.batch_id })}
          </ListingTitle>
          {listing.image_urls && listing.image_urls[0] ? (
            <ListingImage
              src={listing.image_urls[0].replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
              alt={t('market.imageAlt', { species: listing.species })}
              onError={(e) => (e.target.src = '/assets/fallback-fish.jpg')}
            />
          ) : (
            <ListingImage
              src="/assets/fallback-fish.jpg"
              alt={t('market.imageAlt', { species: listing.species })}
            />
          )}
          <ListingDetail>{t('market.weight', { weight: listing.weight })}</ListingDetail>
          <ListingDetail>{t('market.price', { price: listing.price })}</ListingDetail>
          <ListingDetail>
            {t('market.qualityScore', { score: (listing.quality_score * 100).toFixed(2) })}
          </ListingDetail>
        </ListingCard>
      ))}
    </MarketWrapper>
  );
};

export default Market;