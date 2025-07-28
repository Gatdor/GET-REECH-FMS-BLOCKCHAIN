import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { ThemeContext } from '../context/ThemeContext';

const PrivacyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, ${({ theme }) => theme.background || '#f9fafb'} 0%, #e5e7eb 100%);
  padding: 2rem;
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PrivacyCard = styled(motion.div)`
  background: ${({ theme }) => theme.card || '#ffffff'};
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.textSecondary || '#e5e7eb'};
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin-bottom: 1.5rem;
  text-align: center;
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text || '#1f2937'};
  margin-bottom: 0.75rem;
`;

const Paragraph = styled.p`
  color: ${({ theme }) => theme.textSecondary || '#6b7280'};
  line-height: 1.8;
  font-size: 1rem;
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const Privacy = () => {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);

  return (
    <PrivacyWrapper theme={theme}>
      <PrivacyCard
        theme={theme}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Title>{t('privacy.title')}</Title>
        <Section>
          <SectionTitle>{t('privacy.introduction.title')}</SectionTitle>
          <Paragraph>{t('privacy.introduction.text')}</Paragraph>
        </Section>
        <Section>
          <SectionTitle>{t('privacy.dataCollection.title')}</SectionTitle>
          <Paragraph>{t('privacy.dataCollection.text')}</Paragraph>
        </Section>
        <Section>
          <SectionTitle>{t('privacy.dataUsage.title')}</SectionTitle>
          <Paragraph>{t('privacy.dataUsage.text')}</Paragraph>
        </Section>
        <Section>
          <SectionTitle>{t('privacy.dataSharing.title')}</SectionTitle>
          <Paragraph>{t('privacy.dataSharing.text')}</Paragraph>
        </Section>
        <Section>
          <SectionTitle>{t('privacy.contact.title')}</SectionTitle>
          <Paragraph>{t('privacy.contact.text')}</Paragraph>
        </Section>
      </PrivacyCard>
    </PrivacyWrapper>
  );
};

export default Privacy;