import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  // If no token found, redirect to Login page
  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;