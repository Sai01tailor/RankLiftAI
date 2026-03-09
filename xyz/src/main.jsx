/**
 * main.jsx – Application entry point
 * Bootstraps React with StrictMode, wraps the app in AuthProvider,
 * ThemeProvider, and BrowserRouter for routing.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SiteProvider } from './context/SiteContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* ThemeProvider manages dark/light mode across the entire app */}
    <ThemeProvider>
      <SiteProvider>
        <AuthProvider>
          <LanguageProvider>
            <BrowserRouter>
            {/* Global toast notifications – positioned top-right */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-fg)',
                  border: '1px solid var(--toast-border)',
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.875rem',
                },
              }}
            />
            <App />
          </BrowserRouter>
          </LanguageProvider>
        </AuthProvider>
      </SiteProvider>
    </ThemeProvider>
  </StrictMode>
);
