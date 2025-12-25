import React from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorList from '../components/DoctorList'; // Import your existing component

const Doctors = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen bg-slate-50">
      {/* Render the DoctorList component and tell it to go Home when closed */}
      <DoctorList onClose={() => navigate('/')} />
    </div>
  );
};

export default Doctors;