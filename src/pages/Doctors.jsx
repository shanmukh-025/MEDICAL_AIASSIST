import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DoctorList from '../components/DoctorList';

const Doctors = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const familyMemberName = location.state?.familyMemberName || null;
  const familyMemberId = location.state?.familyMemberId || null;
  const familyMemberCity = location.state?.familyMemberCity || null;

  return (
    <div className="h-screen w-screen bg-slate-50">
      <DoctorList 
        onClose={() => navigate('/dashboard')} 
        familyMemberName={familyMemberName}
        familyMemberId={familyMemberId}
        familyMemberCity={familyMemberCity}
      />
    </div>
  );
};

export default Doctors;