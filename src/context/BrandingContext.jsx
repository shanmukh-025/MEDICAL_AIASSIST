import React, { createContext, useState, useContext, useEffect } from 'react';

const BrandingContext = createContext();

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState({
    appName: 'MediAssist',
    logo: null, // Hospital logo URL
    primaryColor: '#059669', // emerald-600
    secondaryColor: '#10b981', // emerald-500
    accentColor: '#34d399', // emerald-400
    hospitalName: '',
    hospitalId: null,
    customStyles: {}
  });

  // Load branding from localStorage or API
  useEffect(() => {
    const loadBranding = async () => {
      try {
        // First check localStorage for cached branding
        const cached = localStorage.getItem('hospital_branding');
        if (cached) {
          const cachedData = JSON.parse(cached);
          setBranding(prev => ({ ...prev, ...cachedData }));
        }

        // Then fetch from API if hospital ID is set
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const hospitalId = user.hospitalId || user.hospital;
        
        if (hospitalId) {
          const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
          const response = await fetch(
            `${API_BASE}/api/hospitals/${hospitalId}/branding`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const brandingData = {
              ...data,
              hospitalId: hospitalId,
              // Ensure logo URL is complete
              logo: data.logo && !data.logo.startsWith('http') 
                ? `${API_BASE}${data.logo}` 
                : data.logo
            };
            
            setBranding(prev => ({
              ...prev,
              ...brandingData
            }));
            localStorage.setItem('hospital_branding', JSON.stringify(brandingData));
          }
        }
      } catch (error) {
        console.error('Failed to load branding:', error);
      }
    };

    loadBranding();
    
    // Re-load branding when user changes (e.g., after login)
    const handleStorageChange = () => {
      loadBranding();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update branding (for hospital admins)
  const updateBranding = async (newBranding) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
      const response = await fetch(
        `${API_BASE}/api/hospitals/${branding.hospitalId}/branding`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(newBranding)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const brandingData = {
          ...data,
          // Ensure logo URL is complete
          logo: data.logo && !data.logo.startsWith('http') 
            ? `${API_BASE}${data.logo}` 
            : data.logo
        };
        
        setBranding(prev => ({ ...prev, ...brandingData }));
        localStorage.setItem('hospital_branding', JSON.stringify(brandingData));
        
        // Trigger a storage event to update other components
        window.dispatchEvent(new Event('storage'));
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update branding:', error);
      return false;
    }
  };
  
  // Refresh branding manually
  const refreshBranding = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const hospitalId = user.hospitalId || user.hospital || branding.hospitalId;
      
      if (hospitalId) {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
        const response = await fetch(
          `${API_BASE}/api/hospitals/${hospitalId}/branding`
        );
        
        if (response.ok) {
          const data = await response.json();
          const brandingData = {
            ...data,
            hospitalId: hospitalId,
            logo: data.logo && !data.logo.startsWith('http') 
              ? `${API_BASE}${data.logo}` 
              : data.logo
          };
          
          setBranding(prev => ({ ...prev, ...brandingData }));
          localStorage.setItem('hospital_branding', JSON.stringify(brandingData));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh branding:', error);
      return false;
    }
  };

  // Apply custom CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', branding.primaryColor);
    root.style.setProperty('--secondary-color', branding.secondaryColor);
    root.style.setProperty('--accent-color', branding.accentColor);
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding, updateBranding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
};

export default BrandingContext;
