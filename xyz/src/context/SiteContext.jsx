import { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../api/services';

const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState({
    siteName: 'JeeWallah',
    logoUrl: '',
    aboutUs: 'Welcome to JeeWallah, your premier destination for JEE preparation.',
    termsAndConditions: 'These are the terms and conditions...',
    footerText: '© 2026 JeeWallah. All rights reserved.',
    loginContent: 'Welcome back! Please login to your account.',
    signupContent: 'Join us today and start your journey.'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await settingsAPI.getSettings();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch site settings', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteContext.Provider value={{ settings, loading, refetchSettings: fetchSettings }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}
