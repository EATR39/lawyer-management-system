/**
 * Avukat Yönetim Sistemi - Theme Context
 * Tema yönetimi ve değiştirme
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { professionalBlue, darkMode, elegantPurple } from '../themes/themes';

// Theme Context
const ThemeContext = createContext(null);

// Mevcut temalar
const themes = {
  professionalBlue,
  darkMode,
  elegantPurple
};

// Tema isimleri
const themeNames = {
  professionalBlue: 'Professional Blue',
  darkMode: 'Dark Mode',
  elegantPurple: 'Elegant Purple'
};

/**
 * Theme Context Provider
 */
export const ThemeContextProvider = ({ children }) => {
  // LocalStorage'dan tema tercihini al
  const [themeName, setThemeName] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved && themes[saved] ? saved : 'professionalBlue';
  });

  // Tema değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('theme', themeName);
  }, [themeName]);

  // Mevcut temayı al
  const theme = useMemo(() => themes[themeName], [themeName]);

  // Tema değiştir
  const changeTheme = (newThemeName) => {
    if (themes[newThemeName]) {
      setThemeName(newThemeName);
    }
  };

  // Sonraki temaya geç
  const toggleTheme = () => {
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setThemeName(themeKeys[nextIndex]);
  };

  const value = {
    themeName,
    themeDisplayName: themeNames[themeName],
    availableThemes: Object.keys(themes).map(key => ({
      key,
      name: themeNames[key]
    })),
    changeTheme,
    toggleTheme,
    isDarkMode: themeName === 'darkMode'
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Theme Context Hook
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme hook must be used within ThemeContextProvider');
  }
  return context;
};

export default ThemeContext;
