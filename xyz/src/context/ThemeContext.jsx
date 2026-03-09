/**
 * ThemeContext.jsx
 * ───────────────────────────────────────────────────────────────────────────
 * Manages the light / dark theme toggle for the entire application.
 *
 * • Persists the user's preference in localStorage ('jw-theme')
 * • Applies [data-theme="dark"] to <html> so all CSS variables flip
 * • Exposes { theme, toggleTheme, isDark } to all children via useTheme()
 *
 * The dark theme is specifically optimised for late-night studying
 * (12 AM – 1 AM sessions) with warm deep-navy backrounds that cut blue light.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Initialise from localStorage, default to 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('jw-theme') || 'light';
  });

  // Apply the data-theme attribute whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jw-theme', theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Hook to consume theme context in any component */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
