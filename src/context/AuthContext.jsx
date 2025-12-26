import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safer Local Storage Loading
    try {
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (savedUser && token && savedUser !== "undefined") {
            setUser(JSON.parse(savedUser));
        }
    } catch (e) {
        console.error("Auth Load Error:", e);
        localStorage.clear();
    } finally {
        setLoading(false);
    }
  }, []);

  const API_URL = `${import.meta.env.VITE_API_BASE}/api/auth`;

  // --- HELPER TO HANDLE ERRORS ---
  const handleResponse = async (res) => {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Request failed");
        return data;
    } else {
        // If server crashes and sends HTML instead of JSON
        const text = await res.text();
        console.error("Server Error (Non-JSON):", text);
        throw new Error("Server Error. Check Backend Terminal.");
    }
  };

  const signup = async (name, email, password) => {
    try {
      console.log("Attempting Signup:", { name, email }); // Debug Log
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await handleResponse(res);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error("Signup Error Detailed:", error);
      return { success: false, message: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      console.log("Attempting Login:", email); // Debug Log
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await handleResponse(res);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error("Login Error Detailed:", error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {!loading ? children : <div className="min-h-screen flex items-center justify-center text-gray-400">Loading App...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);