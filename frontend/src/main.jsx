// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/i18n';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import L from 'leaflet';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <App />
            </BrowserRouter>
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </I18nextProvider>
  </HelmetProvider>
);
// Constants
export const customIcon = new L.Icon({
  iconUrl: './assets/fallback-fish.jpg' || 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});
