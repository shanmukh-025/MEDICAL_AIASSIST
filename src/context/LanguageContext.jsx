import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Default to English ('en')
  const [lang, setLang] = useState('en');

  const toggleLanguage = () => {
    setLang((prevLang) => (prevLang === 'en' ? 'te' : 'en'));
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);