import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { uploadImageToIPFS, createBatchOnBlockchain } from '../services/blockchain';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

const FormWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background || '#f9fafb'};
  padding: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 600px;
  width: 100%;
  padding: 2rem;
  background: ${({ theme }) => theme.card || '#ffffff'};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const PreviewImage = styled.img`
  max-width: 100%;
  border-radius: 8px;
  margin-top: 10px;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text || '#1f2937'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#6b7280'};
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#1e40af'};
    box-shadow: 0 0 5px rgba(30, 64, 175, 0.3);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#6b7280'};
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary || '#1e40af'};
    box-shadow: 0 0 5px rgba(30, 64, 175, 0.3);
  }
`;

const Button = styled.button`
  padding: 0.75rem;
  background: ${({ theme }) => theme.primary || '#1e40af'};
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
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

const ImagePreviews = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
`;

const CatchLog = () => {
  const { t } = useTranslation();
  const { user, supabase, isOnline } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({
    species: '',
    dryingMethod: '',
    batchSize: '',
    weight: '',
    harvestDate: '',
    location: { lat: '', lng: '' },
    shelfLife: '',
    price: '',
    images: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            location: {
              lat: position.coords.latitude.toString(),
              lng: position.coords.longitude.toString(),
            },
          }));
        },
        (err) => {
          setGeoError(t('catchLog.errors.geolocation'));
          Sentry.captureException(err);
        }
      );
    } else {
      setGeoError(t('catchLog.errors.geolocationUnsupported'));
    }
  }, [t]);

  const validateForm = () => {
    if (!formData.species) return t('catchLog.errors.speciesRequired');
    if (!formData.dryingMethod) return t('catchLog.errors.dryingMethodRequired');
    if (!formData.batchSize || formData.batchSize <= 0) return t('catchLog.errors.invalidBatchSize');
    if (!formData.weight || formData.weight <= 0) return t('catchLog.errors.invalidWeight');
    if (!formData.harvestDate) return t('catchLog.errors.harvestDateRequired');
    if (!formData.location.lat || !formData.location.lng) return t('catchLog.errors.locationRequired');
    if (!formData.shelfLife || formData.shelfLife <= 0) return t('catchLog.errors.invalidShelfLife');
    if (!formData.price || formData.price <= 0) return t('catchLog.errors.invalidPrice');
    if (formData.images.length === 0) return t('catchLog.errors.imageRequired');
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'lat' || name === 'lng') {
      setFormData((prev) => ({
        ...prev,
        location: { ...prev.location, [name]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, images: files }));
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError(t('catchLog.errors.unauthenticated'));
      return;
    }

    setError('');
    setLoading(true);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const batchId = `BATCH_${Date.now()}`;
      let imageUrls = [];
      let qualityScore = 0.5; // Default quality score

      if (isOnline) {
        imageUrls = await Promise.all(
          formData.images.map(async (file) => {
            const ipfsUrl = await uploadImageToIPFS(file);
            const { data } = await supabase.storage
              .from('fish-images')
              .upload(`public/${batchId}_${file.name}`, file);
            return data ? supabase.storage.from('fish-images').getPublicUrl(data.path).data.publicUrl : ipfsUrl;
          })
        );
      }

      const data = {
        batch_id: batchId,
        user_id: user.id,
        species: formData.species,
        drying_method: formData.dryingMethod,
        batch_size: parseFloat(formData.batchSize),
        weight: parseFloat(formData.weight),
        harvest_date: formData.harvestDate,
        location: `POINT(${formData.location.lng} ${formData.location.lat})`,
        shelf_life: parseInt(formData.shelfLife, 10),
        price: parseFloat(formData.price),
        image_urls: imageUrls,
        quality_score: qualityScore,
      };

      if (isOnline) {
        const { error: dbError } = await supabase.from('catch_logs').insert(data);
        if (dbError) throw dbError;
        await createBatchOnBlockchain(data); // Uncommented for Ethereum integration
      } else {
        await set('offlineActions', [
          ...(await get('offlineActions') || []),
          { type: 'catch_log', data },
        ]);
      }

      alert(t('catchLog.success'));
      setFormData({
        species: '',
        dryingMethod: '',
        batchSize: '',
        weight: '',
        harvestDate: '',
        location: { lat: '', lng: '' },
        shelfLife: '',
        price: '',
        images: [],
      });
      setImagePreviews([]);
    } catch (error) {
      Sentry.captureException(error);
      setError(error.message || t('catchLog.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormWrapper theme={theme}>
      <Form onSubmit={handleSubmit}>
        <h2>{t('catchLog.title')}</h2>
        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        {geoError && <ErrorMessage role="alert">{geoError}</ErrorMessage>}

        <div>
          <Label htmlFor="species">
            {t('catchLog.species')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="species-tip" data-tooltip-content={t('catchLog.tooltips.species')} />
          </Label>
          <Select
            id="species"
            name="species"
            value={formData.species}
            onChange={handleChange}
            required
            aria-describedby="species-tip"
          >
            <option value="">{t('catchLog.placeholders.species')}</option>
            <option value="Tilapia">{t('catchLog.speciesOptions.tilapia')}</option>
            <option value="Nile Perch">{t('catchLog.speciesOptions.nilePerch')}</option>
            <option value="Dagaa">{t('catchLog.speciesOptions.dagaa')}</option>
          </Select>
          <Tooltip id="species-tip" />
        </div>

        <div>
          <Label htmlFor="dryingMethod">
            {t('catchLog.dryingMethod')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="dryingMethod-tip" data-tooltip-content={t('catchLog.tooltips.dryingMethod')} />
          </Label>
          <Select
            id="dryingMethod"
            name="dryingMethod"
            value={formData.dryingMethod}
            onChange={handleChange}
            required
            aria-describedby="dryingMethod-tip"
          >
            <option value="">{t('catchLog.placeholders.dryingMethod')}</option>
            <option value="Sun">{t('catchLog.dryingMethods.sun')}</option>
            <option value="Solar">{t('catchLog.dryingMethods.solar')}</option>
            <option value="Smoke">{t('catchLog.dryingMethods.smoke')}</option>
          </Select>
          <Tooltip id="dryingMethod-tip" />
        </div>

        <div>
          <Label htmlFor="batchSize">
            {t('catchLog.batchSize')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="batchSize-tip" data-tooltip-content={t('catchLog.tooltips.batchSize')} />
          </Label>
          <Input
            id="batchSize"
            type="number"
            name="batchSize"
            value={formData.batchSize}
            onChange={handleChange}
            placeholder={t('catchLog.placeholders.batchSize')}
            required
            min="0"
            step="0.1"
            aria-describedby="batchSize-tip"
          />
          <Tooltip id="batchSize-tip" />
        </div>

        <div>
          <Label htmlFor="weight">
            {t('catchLog.weight')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="weight-tip" data-tooltip-content={t('catchLog.tooltips.weight')} />
          </Label>
          <Input
            id="weight"
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            placeholder={t('catchLog.placeholders.weight')}
            required
            min="0"
            step="0.1"
            aria-describedby="weight-tip"
          />
          <Tooltip id="weight-tip" />
        </div>

        <div>
          <Label htmlFor="harvestDate">
            {t('catchLog.harvestDate')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="harvestDate-tip" data-tooltip-content={t('catchLog.tooltips.harvestDate')} />
          </Label>
          <Input
            id="harvestDate"
            type="date"
            name="harvestDate"
            value={formData.harvestDate}
            onChange={handleChange}
            required
            aria-describedby="harvestDate-tip"
          />
          <Tooltip id="harvestDate-tip" />
        </div>

        <div>
          <Label htmlFor="lat">
            {t('catchLog.location.lat')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="lat-tip" data-tooltip-content={t('catchLog.tooltips.lat')} />
          </Label>
          <Input
            id="lat"
            type="number"
            name="lat"
            value={formData.location.lat}
            onChange={handleChange}
            placeholder={t('catchLog.placeholders.lat')}
            required
            step="any"
            aria-describedby="lat-tip"
          />
          <Tooltip id="lat-tip" />
        </div>

        <div>
          <Label htmlFor="lng">
            {t('catchLog.location.lng')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="lng-tip" data-tooltip-content={t('catchLog.tooltips.lng')} />
          </Label>
          <Input
            id="lng"
            type="number"
            name="lng"
            value={formData.location.lng}
            onChange={handleChange}
            placeholder={t('catchLog.placeholders.lng')}
            required
            step="any"
            aria-describedby="lng-tip"
          />
          <Tooltip id="lng-tip" />
        </div>

        <div>
          <Label htmlFor="shelfLife">
            {t('catchLog.shelfLife')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="shelfLife-tip" data-tooltip-content={t('catchLog.tooltips.shelfLife')} />
          </Label>
          <Input
            id="shelfLife"
            type="number"
            name="shelfLife"
            value={formData.shelfLife}
            onChange={handleChange}
            placeholder={t('catchLog.placeholders.shelfLife')}
            required
            min="0"
            aria-describedby="shelfLife-tip"
          />
          <Tooltip id="shelfLife-tip" />
        </div>

        <div>
          <Label htmlFor="price">
            {t('catchLog.price')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="price-tip" data-tooltip-content={t('catchLog.tooltips.price')} />
          </Label>
          <Input
            id="price"
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder={t('catchLog.placeholders.price')}
            required
            min="0"
            step="0.01"
            aria-describedby="price-tip"
          />
          <Tooltip id="price-tip" />
        </div>

        <div>
          <Label htmlFor="images">
            {t('catchLog.images')}
            <FontAwesomeIcon icon={faInfoCircle} data-tooltip-id="images-tip" data-tooltip-content={t('catchLog.tooltips.images')} />
          </Label>
          <Input
            id="images"
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleImageUpload}
            required
            aria-describedby="images-tip"
          />
          <Tooltip id="images-tip" />
          <ImagePreviews>
            {imagePreviews.map((url, index) => (
              <PreviewImage key={index} src={url} alt={`${t('imagePreview')} ${index + 1}`} />
            ))}
          </ImagePreviews>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? t('catchLog.submitting') : t('submit')}
        </Button>
      </Form>
    </FormWrapper>
  );
};

export default CatchLog;