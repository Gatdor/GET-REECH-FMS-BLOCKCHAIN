import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faFish, faShoppingCart, faSignOutAlt, faBars, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { uploadImageToIPFS, createBatchOnBlockchain } from '../services/blockchain';
import { get, set } from 'idb-keyval';
import * as Sentry from '@sentry/react';

// Styled Components (aligned with Dashboard.jsx, Market.jsx, Profile.jsx, AdminUsers.jsx)
const AdminContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  font-family: 'Roboto', sans-serif;
  overflow-x: hidden;
`;

const Sidebar = styled(motion.aside)`
  width: 250px;
  background: ${({ theme }) => theme.primary || '#1E3A8A'};
  color: white;
  padding: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 0;
  height: 100vh;
  @media (max-width: 768px) {
    width: 100%;
    position: fixed;
    z-index: 1000;
    transform: ${({ isOpen }) => (isOpen ? 'translateX(0)' : 'translateX(-100%)')};
    transition: transform 0.3s ease;
  }
`;

const SidebarLink = styled(motion.div)`
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  cursor: pointer;
  font-size: clamp(0.9rem, 2vw, 1rem);
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: clamp(1rem, 3vw, 2rem);
  background: ${({ theme }) => theme.background || '#F1F5F9'};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: clamp(1rem, 3vw, 2rem);
  border-radius: 8px;
`;

const MenuButton = styled(motion.button)`
  display: none;
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  cursor: pointer;
  @media (max-width: 768px) {
    display: block;
  }
`;

const Title = styled.h1`
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
  margin: 0;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  font-size: clamp(0.8rem, 2vw, 1rem);
  color: ${({ theme }) => theme.text || '#1E3A8A'};
`;

const LogoutButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary || '#3B82F6'};
  cursor: pointer;
  font-size: clamp(0.8rem, 2vw, 1rem);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormWrapper = styled.div`
  max-width: 600px;
  width: 100%;
  background: white;
  padding: clamp(1.5rem, 3vw, 2rem);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 1.5rem);
`;

const Label = styled.label`
  font-weight: 600;
  font-size: clamp(0.9rem, 2vw, 0.95rem);
  color: ${({ theme }) => theme.text || '#1F2937'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
  background: white;
  transition: border-color 0.3s, box-shadow 0.3s;
  width: 100%;
  box-sizing: border-box;
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#3B82F6'};
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
  background: white;
  transition: border-color 0.3s, box-shadow 0.3s;
  &:focus {
    outline: 2px solid ${({ theme }) => theme.primary || '#3B82F6'};
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
  }
`;

const Button = styled(motion.button)`
  padding: 0.75rem;
  background: linear-gradient(90deg, ${({ theme }) => theme.primary || '#1E3A8A'} 0%, ${({ theme }) => theme.primaryHover || '#3B82F6'} 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
  &:hover {
    background: linear-gradient(90deg, ${({ theme }) => theme.primaryHover || '#2563EB'} 0%, #1E3A8A 100%);
  }
  &:disabled {
    background: ${({ theme }) => theme.textSecondary || '#6B7280'};
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const ResetButton = styled(motion.button)`
  padding: 0.75rem;
  background: #E5E7EB;
  color: #1F2937;
  border: none;
  border-radius: 8px;
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
  &:hover {
    background: #D1D5DB;
  }
`;

const ErrorMessage = styled(motion.p)`
  color: #EF4444;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  text-align: center;
  margin-bottom: clamp(0.5rem, 2vw, 1rem);
`;

const SuccessMessage = styled(motion.p)`
  color: #065F46;
  background: #D1FAE5;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  text-align: center;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: clamp(0.5rem, 2vw, 1rem);
`;

const ImagePreviews = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 112.5px; /* 4:3 aspect ratio (150px width * 0.75) */
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#D1D5DB'};
`;

// Animation Variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const CatchLog = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, supabase, isOnline, logout } = useAuth();
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
  const [success, setSuccess] = useState('');
  const [geoError, setGeoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
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
  }, [user, navigate, t]);

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
    setSuccess('');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({ ...prev, images: files }));
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setError('');
    setSuccess('');
  };

  const handleReset = () => {
    setFormData({
      species: '',
      dryingMethod: '',
      batchSize: '',
      weight: '',
      harvestDate: '',
      location: { lat: formData.location.lat, lng: formData.location.lng },
      shelfLife: '',
      price: '',
      images: [],
    });
    setImagePreviews([]);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError(t('catchLog.errors.unauthenticated'));
      return;
    }

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
      const batchId = `BATCH_${Date.now()}`;
      let imageUrls = [];
      let qualityScore = 0.5; // Default quality score

      if (isOnline) {
        imageUrls = await Promise.all(
          formData.images.map(async (file) => {
            const ipfsUrl = await uploadImageToIPFS(file);
            const { data, error } = await supabase.storage
              .from('fish-images')
              .upload(`public/${batchId}_${file.name}`, file);
            if (error) throw error;
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
        await createBatchOnBlockchain(data);
        setSuccess(t('catchLog.success'));
      } else {
        await set('offlineActions', [
          ...(await get('offlineActions') || []),
          { type: 'catch_log', data },
        ]);
        setSuccess(t('catchLog.successOffline'));
      }

      setFormData({
        species: '',
        dryingMethod: '',
        batchSize: '',
        weight: '',
        harvestDate: '',
        location: { lat: formData.location.lat, lng: formData.location.lng },
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
    <AnimatePresence>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3 }}
      >
        <AdminContainer theme={theme}>
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
            <SidebarLink as={Link} to="/dashboard" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faUsers} /> {t('Dashboard')}
            </SidebarLink>
            <SidebarLink as={Link} to="/admin/users" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faUsers} /> {t('Manage Users')}
            </SidebarLink>
            <SidebarLink as={Link} to="/admin/catch-logs" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faFish} /> {t('Catch Logs')}
            </SidebarLink>
            <SidebarLink as={Link} to="/admin/market" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
              <FontAwesomeIcon icon={faShoppingCart} /> {t('Market')}
            </SidebarLink>
            <SidebarLink as={Link} to="/profile" whileHover={{ scale: 1.05 }} onClick={() => setIsSidebarOpen(false)}>
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
          </Sidebar>
          <MainContent>
            <Header>
              <MenuButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <FontAwesomeIcon icon={faBars} />
              </MenuButton>
              <Title>{t('catchLog.title')}</Title>
              <UserInfo>
                {user?.user_metadata?.name} ({user?.user_metadata?.role})
                <LogoutButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => logout()}>
                  <FontAwesomeIcon icon={faSignOutAlt} /> {t('Logout')}
                </LogoutButton>
              </UserInfo>
            </Header>
            <FormWrapper>
              <Form onSubmit={handleSubmit}>
                <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', textAlign: 'center' }}>
                  {t('catchLog.title')}
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
                    </ErrorMessage>
                  )}
                  {geoError && (
                    <ErrorMessage
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      aria-live="assertive"
                    >
                      {geoError}
                    </ErrorMessage>
                  )}
                  {success && (
                    <SuccessMessage
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      role="alert"
                      aria-live="polite"
                    >
                      {success}
                    </SuccessMessage>
                  )}
                </AnimatePresence>
                <div>
                  <Label htmlFor="species">
                    {t('catchLog.species')}
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="species-tip"
                      data-tooltip-content={t('catchLog.tooltips.species')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="dryingMethod-tip"
                      data-tooltip-content={t('catchLog.tooltips.dryingMethod')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="batchSize-tip"
                      data-tooltip-content={t('catchLog.tooltips.batchSize')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="weight-tip"
                      data-tooltip-content={t('catchLog.tooltips.weight')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="harvestDate-tip"
                      data-tooltip-content={t('catchLog.tooltips.harvestDate')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="lat-tip"
                      data-tooltip-content={t('catchLog.tooltips.lat')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="lng-tip"
                      data-tooltip-content={t('catchLog.tooltips.lng')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="shelfLife-tip"
                      data-tooltip-content={t('catchLog.tooltips.shelfLife')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="price-tip"
                      data-tooltip-content={t('catchLog.tooltips.price')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      data-tooltip-id="images-tip"
                      data-tooltip-content={t('catchLog.tooltips.images')}
                      style={{ cursor: 'pointer', color: theme.textSecondary || '#6B7280' }}
                    />
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
                      <PreviewImage
                        key={index}
                        src={url}
                        alt={`${t('catchLog.imagePreview')} ${index + 1}`}
                        onError={(e) => (e.target.src = '/assets/fallback-image.jpg')}
                      />
                    ))}
                  </ImagePreviews>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <Button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={loading ? t('catchLog.submitting') : t('catchLog.submit')}
                  >
                    {loading ? t('catchLog.submitting') : t('catchLog.submit')}
                  </Button>
                  <ResetButton
                    type="button"
                    onClick={handleReset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={t('catchLog.reset')}
                  >
                    {t('catchLog.reset')}
                  </ResetButton>
                </div>
              </Form>
            </FormWrapper>
          </MainContent>
        </AdminContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default CatchLog;