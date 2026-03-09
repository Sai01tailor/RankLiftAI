/**
 * LanguageContext.jsx
 * ──────────────────────────────────────────────────────────────────────────
 * Provides a global language state used across:
 *   - ProblemPage   (practice mode language switcher)
 *   - MockTestEngine (CBT language toggle)
 *   - Settings / Dashboard (set preferred third language)
 *
 * The switcher always offers exactly 3 options:
 *   1. English (always)
 *   2. Hindi   (always)
 *   3. User's preferred regional language (set in Settings/Dashboard)
 *
 * JEE Advanced questions are restricted to English + Hindi only.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// All JEE Main supported regional languages beyond en+hi
export const REGIONAL_LANGUAGES = [
  { code: 'gj', name: 'ગુજરાતી', label: 'Gujarati' },
  { code: 'mr', name: 'मराठी',    label: 'Marathi' },
  { code: 'ta', name: 'தமிழ்',   label: 'Tamil' },
  { code: 'te', name: 'తెలుగు',  label: 'Telugu' },
  { code: 'kn', name: 'ಕನ್ನಡ',   label: 'Kannada' },
  { code: 'bn', name: 'বাংলা',    label: 'Bengali' },
  { code: 'ur', name: 'اردو',     label: 'Urdu' },
];

export const ALL_LANGUAGES = [
  { code: 'en', name: 'English', label: 'English' },
  { code: 'hi', name: 'हिन्दी', label: 'Hindi' },
  ...REGIONAL_LANGUAGES,
];

export const LANG_DISPLAY = Object.fromEntries(
  ALL_LANGUAGES.map(l => [l.code, { name: l.name, label: l.label }])
);

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // activeLang: the language currently displayed in practice / mock test
  const [activeLang, setActiveLangState] = useState(
    () => localStorage.getItem('jw-lang') || 'en'
  );

  // preferredThirdLang: the regional language the user has chosen as their 3rd option
  const [preferredThirdLang, setPreferredThirdLangState] = useState(
    () => localStorage.getItem('jw-third-lang') || 'gj'
  );

  /** Set the in-session reading language */
  const setActiveLang = useCallback((code) => {
    setActiveLangState(code);
    localStorage.setItem('jw-lang', code);
  }, []);

  /** Set the user's preferred regional language (saved in settings) */
  const setPreferredThirdLang = useCallback((code) => {
    setPreferredThirdLangState(code);
    localStorage.setItem('jw-third-lang', code);
    // If current active lang is not in the new set, reset to en
    // (e.g., user had Telugu selected but changes third-lang to Marathi)
    if (!['en', 'hi', code].includes(activeLang)) {
      setActiveLang('en');
    }
  }, [activeLang, setActiveLang]);

  /**
   * Check if a question has content in the given language.
   * Works for both question.content and question.options (for SCQ/MCQ).
   */
  const hasTranslation = useCallback((question, langCode) => {
    if (!question) return langCode === 'en'; // fallback
    const c = question.content?.[langCode];
    const text = typeof c === 'string' ? c : c?.text;
    return !!(text?.trim());
  }, []);

  /**
   * Returns language options available for a specific question.
   * - Always returns EN (it's required).
   * - HI is shown only if the question has hindi content.
   * - Regional lang shown only if question has that content.
   * - If no question passed, returns all 3 candidate langs (old behaviour).
   */
  const getAvailableLangs = useCallback((examCategory, question) => {
    const isAdvancedOnly = examCategory === 'JEE Advanced';
    const third = REGIONAL_LANGUAGES.find(l => l.code === preferredThirdLang) || REGIONAL_LANGUAGES[0];

    // Candidate set based on exam category
    const candidates = isAdvancedOnly
      ? [
          { code: 'en', name: 'EN', label: 'English' },
          { code: 'hi', name: 'HI', label: 'हिन्दी' },
        ]
      : [
          { code: 'en',        name: 'EN',                    label: 'English' },
          { code: 'hi',        name: 'HI',                    label: 'हिन्दी' },
          { code: third.code,  name: third.code.toUpperCase(), label: third.name },
        ];

    // If no question passed → return all candidates (backward compat)
    if (!question) return candidates;

    // Filter to only languages that have actual content on this question
    // English is always kept as a guaranteed fallback
    return candidates.filter(l =>
      l.code === 'en' || hasTranslation(question, l.code)
    );
  }, [preferredThirdLang, hasTranslation]);

  /**
   * Resolve the best displayable text from a multilingual field.
   * Falls back: activeLang → en → hi → first available
   */
  const resolveText = useCallback((field, examCategory) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    const isAdvancedOnly = examCategory === 'JEE Advanced';

    // For JEE Advanced, only en/hi
    const langOrder = isAdvancedOnly
      ? ['en', 'hi']
      : [activeLang, 'en', 'hi', preferredThirdLang];

    for (const code of langOrder) {
      const variant = field[code];
      if (!variant) continue;
      const text = typeof variant === 'string' ? variant : variant.text;
      if (text?.trim()) return text;
    }
    return '';
  }, [activeLang, preferredThirdLang]);

  return (
    <LanguageContext.Provider value={{
      activeLang,
      setActiveLang,
      preferredThirdLang,
      setPreferredThirdLang,
      getAvailableLangs,
      hasTranslation,
      resolveText,
      REGIONAL_LANGUAGES,
      ALL_LANGUAGES,
      LANG_DISPLAY,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
