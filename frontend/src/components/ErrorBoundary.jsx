// src/components/ErrorBoundary.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>{t('errorTitle', 'Something went wrong')}</h1>
          <p>{this.state.error?.message}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            {t('refresh', 'Refresh')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default (props) => {
  const { t } = useTranslation();
  return <ErrorBoundary {...props} t={t} />;
};