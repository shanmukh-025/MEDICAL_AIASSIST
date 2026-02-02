import offlineStorage from './offlineStorage';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Check if online
export const isOnline = () => {
  return navigator.onLine;
};

// Enhanced fetch with offline support
export const fetchWithOffline = async (endpoint, options = {}) => {
  const fullUrl = `${API_BASE}${endpoint}`;
  const cacheKey = `${options.method || 'GET'}_${endpoint}`;

  try {
    // If online, try network first
    if (isOnline()) {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token'),
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Cache successful GET requests
      if (!options.method || options.method === 'GET') {
        await offlineStorage.cacheAPIResponse(cacheKey, data);
      }

      return { data, fromCache: false };
    } else {
      // Offline - use cache
      throw new Error('Offline');
    }
  } catch (error) {
    console.log(`Network error for ${endpoint}, using cache:`, error.message);

    // Try to get from cache
    const cachedData = await offlineStorage.getCachedAPIResponse(cacheKey);
    
    if (cachedData) {
      return { data: cachedData, fromCache: true };
    }

    // No cache available
    throw new Error('No cached data available offline');
  }
};

// API methods
export const api = {
  // Health Records
  async getRecords() {
    try {
      const result = await fetchWithOffline('/api/records');
      
      // Save to IndexedDB for offline access
      if (Array.isArray(result.data)) {
        await offlineStorage.saveRecords(result.data);
      }
      
      return result;
    } catch (error) {
      // eslint-disable-next-line no-unused-vars
      // Fallback to IndexedDB
      const records = await offlineStorage.getRecords();
      return { data: records, fromCache: true };
    }
  },

  async createRecord(recordData) {
    if (!isOnline()) {
      throw new Error('Cannot create records offline. Please connect to internet.');
    }

    const result = await fetchWithOffline('/api/records', {
      method: 'POST',
      body: JSON.stringify(recordData)
    });

    return result;
  },

  // Family Members
  async getFamilyMembers() {
    try {
      const result = await fetchWithOffline('/api/family');
      
      if (Array.isArray(result.data)) {
        await offlineStorage.saveFamilyMembers(result.data);
      }
      
      return result;
    } catch (error) {
      console.log('getFamilyMembers offline fallback:', error.message);
      const members = await offlineStorage.getFamilyMembers();
      return { data: members, fromCache: true };
    }
  },

  async createFamilyMember(memberData) {
    if (!isOnline()) {
      throw new Error('Cannot add family members offline. Please connect to internet.');
    }

    const result = await fetchWithOffline('/api/family', {
      method: 'POST',
      body: JSON.stringify(memberData)
    });

    return result;
  },

  // Appointments
  async getAppointments() {
    try {
      const result = await fetchWithOffline('/api/appointments');
      
      if (Array.isArray(result.data)) {
        await offlineStorage.saveAppointments(result.data);
      }
      
      return result;
    } catch (error) {
      console.log('getAppointments offline fallback:', error.message);
      const appointments = await offlineStorage.getAppointments();
      return { data: appointments, fromCache: true };
    }
  },

  async createAppointment(appointmentData) {
    if (!isOnline()) {
      throw new Error('Cannot book appointments offline. Please connect to internet.');
    }

    const result = await fetchWithOffline('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });

    return result;
  },

  // AI Chat (requires online)
  async sendChatMessage(message) {
    if (!isOnline()) {
      return {
        data: {
          response: "⚠️ AI Assistant requires internet connection. I can help you with:\n\n• View your saved health records (offline)\n• Check family member profiles (offline)\n• View appointments (offline)\n• Basic first aid guidance (offline)\n\nPlease connect to internet for AI medical assistance."
        },
        fromCache: true
      };
    }

    return await fetchWithOffline('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
};

export default api;
